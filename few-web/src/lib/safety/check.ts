import type { Food, Recipe } from "@/data/types";

export type LineLabel = "Okay" | "Check the label" | "Limit" | "Avoid" | "Ask your doctor" | "Okay if prepared safely";

export type OverallLabel = "Okay for pregnancy" | "Okay with changes" | "Not recommended";

export type IngredientCheck = {
  label: LineLabel;
  item: string;
  detail: string;
  fix: string | null;
  foodSlug: string | null;
};

export type StepFlag = {
  text: string;
  problem: string;
  temperature: string | null;
};

export type RecipeCheck = {
  overall: OverallLabel;
  ingredients: IngredientCheck[];
  steps: StepFlag[];
  whatsGood: string[];
};

const UNITS = [
  "cups",
  "cup",
  "tablespoons",
  "tablespoon",
  "teaspoons",
  "teaspoon",
  "ounces",
  "ounce",
  "pounds",
  "pound",
  "cloves",
  "clove",
  "cans",
  "can",
  "large",
  "medium",
  "small",
  "oz",
  "lb",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function parseIngredientLine(line: string) {
  const cleaned = line.replace(/^[-*]\s*/, "").trim();
  const match = cleaned.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return { amount: null, unit: null, item: cleaned };
  const rest = match[2];
  const first = rest.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (UNITS.includes(first)) {
    return { amount: match[1], unit: first, item: rest.slice(first.length).trim() };
  }
  return { amount: match[1], unit: null, item: rest };
}

export function matchFood(foods: Food[], item: string) {
  const hay = normalize(item);
  let best: { food: Food; length: number } | null = null;
  for (const food of foods) {
    const names = [food.name, food.slug.replace(/-/g, " "), ...food.aliases];
    for (const name of names) {
      const needle = normalize(name);
      if (needle.length < 3) continue;
      const pattern = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (pattern.test(hay) && (!best || needle.length > best.length)) {
        best = { food, length: needle.length };
      }
    }
  }
  return best?.food ?? null;
}

function blobFor(recipe: Recipe | null, steps: string[]) {
  const tips = recipe?.chef_tips.join(" ") ?? "";
  const note = recipe?.safety_note ?? "";
  return `${steps.join(" ")} ${tips} ${note}`.toLowerCase();
}

function cookingCovered(food: Food, blob: string) {
  if (food.preparation?.toLowerCase().includes("canned")) return true;
  if (food.slug === "eggs") return /firm|fully cooked|fully set|160/.test(blob);
  if (["salmon", "tilapia", "sardines", "canned-salmon", "canned-tuna"].includes(food.slug)) {
    return /opaque|145|flak|cooked through|canned/.test(blob);
  }
  if (food.slug === "deli-meat" || food.slug === "smoked-seafood") return /165|steaming/.test(blob);
  return /165|160|145|steaming|thoroughly cooked|cooked through|internal temperature/.test(blob);
}

function labelCheck(food: Food) {
  const text = `${food.safe_version ?? ""} ${food.reason ?? ""}`.toLowerCase();
  return /pasteurized|label|canned light|albacore|best choice/.test(text);
}

function lineForFood(food: Food, item: string, blob: string): IngredientCheck {
  if (food.verdict === "avoid") {
    return { label: "Avoid", item, detail: food.reason ?? "This food is on an avoid list.", fix: food.safe_version, foodSlug: food.slug };
  }
  if (food.verdict === "limit") {
    return { label: "Limit", item, detail: food.reason ?? "This food has a limit.", fix: food.safe_version, foodSlug: food.slug };
  }
  if (food.verdict === "okay") {
    return { label: "Okay", item, detail: food.reason ?? "This food is listed as a choice you can eat.", fix: null, foodSlug: food.slug };
  }
  if (food.verdict === "okay_if_prepared") {
    if (labelCheck(food)) {
      return {
        label: "Check the label",
        item,
        detail: food.reason ?? "Check how this food was made.",
        fix: food.safe_version,
        foodSlug: food.slug,
      };
    }
    if (cookingCovered(food, blob)) {
      return { label: "Okay", item, detail: food.reason ?? "The recipe cooks this food.", fix: null, foodSlug: food.slug };
    }
    return {
      label: "Okay if prepared safely",
      item,
      detail: food.reason ?? "This food needs the safe preparation.",
      fix: food.safe_version,
      foodSlug: food.slug,
    };
  }
  return {
    label: "Ask your doctor",
    item,
    detail: "We can't check this one. Ask your doctor or midwife.",
    fix: null,
    foodSlug: food.slug,
  };
}

function scanSteps(steps: string[], foodsInRecipe: Food[]) {
  const flags: StepFlag[] = [];
  const names = foodsInRecipe.map((food) => food.name.toLowerCase()).join(" ");
  for (const text of steps) {
    const lower = text.toLowerCase();
    if (/medium-rare|medium rare|\brare\b/.test(lower)) {
      const fish = /fish|salmon|tilapia|tuna|seafood/.test(lower + names);
      flags.push({
        text,
        problem: "Rare or medium-rare is not a fully cooked food.",
        temperature: fish ? "Cook seafood to 145°F (63°C)." : "Cook meat and poultry to the USDA-recommended minimum internal temperature.",
      });
    }
    if (/runny yolk|soft yolk|soft-boiled|sunny-side|over easy/.test(lower)) {
      flags.push({
        text,
        problem: "Egg yolks and whites need to be firm.",
        temperature: "Cook eggs until the yolks and whites are firm. Cook egg dishes to 160°F (71°C).",
      });
    }
    if (/\bno-bake\b/.test(lower) && /egg/.test(lower + names)) {
      flags.push({
        text,
        problem: "A no-bake recipe that uses egg can leave the egg raw.",
        temperature: "Use pasteurized eggs, or cook the eggs until the yolks and whites are firm.",
      });
    }
    if (/\braw\b/.test(lower) && /egg|meat|fish|beef|chicken|dough|batter|milk|sprout|sushi|oyster/.test(lower + names)) {
      flags.push({
        text,
        problem: "Raw meat, fish, egg, dough, milk, or sprouts are on the avoid list for pregnancy.",
        temperature: "Cook seafood to 145°F (63°C), egg dishes to 160°F (71°C), and reheat deli meats to 165°F (74°C).",
      });
    }
    if (/lightly cooked|seared/.test(lower)) {
      flags.push({
        text,
        problem: "Lightly cooked or only seared food may not reach a safe temperature.",
        temperature: "Cook seafood to 145°F (63°C). Cook egg dishes to 160°F (71°C).",
      });
    }
    if (/\b(wine|beer|liquor|vodka|rum|whiskey|bourbon)\b/.test(lower)) {
      flags.push({
        text,
        problem: "There is no known safe amount of alcohol during pregnancy, including wine, beer, and liquor.",
        temperature: null,
      });
    }
  }
  return flags;
}

function whatsGood(foods: Food[], recipe: Recipe | null) {
  if (recipe) return recipe.nutrition_highlights;
  const fish = foods.some((food) => ["salmon", "tilapia", "sardines", "canned-salmon", "canned-tuna"].includes(food.slug) && food.verdict !== "avoid");
  return fish ? ["Omega-3 fats (DHA and EPA)", "Iron", "Iodine", "Choline"] : [];
}

export function checkIngredients(
  lines: { amount: string | null; unit: string | null; item: string }[],
  steps: string[],
  foods: Food[],
  recipe: Recipe | null,
): RecipeCheck {
  const blob = blobFor(recipe, steps);
  const ingredients: IngredientCheck[] = [];
  const matched: Food[] = [];

  for (const line of lines) {
    const food = matchFood(foods, line.item);
    const shown = [line.amount, line.unit, line.item].filter(Boolean).join(" ");
    if (!food) {
      if (recipe) continue;
      ingredients.push({
        label: "Ask your doctor",
        item: shown,
        detail: "We can't check this one. Ask your doctor or midwife.",
        fix: null,
        foodSlug: null,
      });
      continue;
    }
    matched.push(food);
    if (recipe && food.verdict === "unknown") continue;
    ingredients.push(lineForFood(food, shown, blob));
  }

  const stepFlags = scanSteps(steps, matched);
  const labels = ingredients.map((line) => line.label);
  let overall: OverallLabel = "Okay for pregnancy";
  if (labels.includes("Avoid") || stepFlags.some((flag) => /alcohol|raw|rare/i.test(flag.problem))) {
    overall = "Not recommended";
  } else if (
    labels.some((label) => label === "Limit" || label === "Check the label" || label === "Okay if prepared safely" || label === "Ask your doctor") ||
    stepFlags.length > 0
  ) {
    overall = "Okay with changes";
  }

  return { overall, ingredients, steps: stepFlags, whatsGood: whatsGood(matched, recipe) };
}

export function checkRecipe(recipe: Recipe, foods: Food[]) {
  return checkIngredients(
    recipe.ingredients.map((ingredient) => ({
      amount: ingredient.amount === null ? null : String(ingredient.amount),
      unit: ingredient.unit,
      item: ingredient.item,
    })),
    recipe.steps.map((step) => step.text),
    foods,
    recipe,
  );
}

export function badgeVerdict(overall: OverallLabel): "okay" | "okay_if_prepared" | "avoid" {
  if (overall === "Okay for pregnancy") return "okay";
  if (overall === "Okay with changes") return "okay_if_prepared";
  return "avoid";
}
