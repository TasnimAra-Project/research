import type { DietTag, EffortTag, Meal, Recipe, Stage } from "@/data/types";
import { costPerServing } from "@/lib/format";

export type Nutrient = "folate" | "iron" | "calcium" | "choline" | "omega-3" | "fiber";
export type StageFilter = "pregnancy" | "breastfeeding";
export type RecipeSort = "listed" | "quickest" | "cheapest" | "newest";

export type RecipeQuery = {
  search: string;
  maxMinutes: number | null;
  maxCost: number | null;
  meals: Meal[];
  efforts: EffortTag[];
  diets: DietTag[];
  nutrients: Nutrient[];
  stages: StageFilter[];
  wicOnly: boolean;
  includeIngredient: string;
  excludeIngredient: string;
  avoidTerms: string[];
  have: [string, string, string];
  sort: RecipeSort;
};

export const emptyRecipeQuery: RecipeQuery = {
  search: "",
  maxMinutes: null,
  maxCost: null,
  meals: [],
  efforts: [],
  diets: [],
  nutrients: [],
  stages: [],
  wicOnly: false,
  includeIngredient: "",
  excludeIngredient: "",
  avoidTerms: [],
  have: ["", "", ""],
  sort: "listed",
};

export const TIME_OPTIONS = [10, 15, 30, 40] as const;
export const COST_OPTIONS = [1, 1.5, 2, 3] as const;

const NUTRIENT_PATTERN: Record<Nutrient, RegExp> = {
  folate: /\bfolate\b/i,
  iron: /\biron\b/i,
  calcium: /\bcalcium\b/i,
  choline: /\bcholine\b/i,
  "omega-3": /omega-3/i,
  fiber: /\bfiber\b/i,
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function sameIngredient(token: string, needle: string) {
  if (token === needle) return true;
  const [shorter, longer] = token.length <= needle.length ? [token, needle] : [needle, token];
  if (shorter.length < 3) return false;
  return longer === `${shorter}s` || longer === `${shorter}es`;
}

function ingredientTokens(recipe: Recipe) {
  return recipe.ingredients.flatMap((ingredient) => tokens(`${ingredient.item} ${ingredient.display}`));
}

export function matchesIngredient(recipe: Recipe, query: string) {
  const needles = tokens(query);
  if (needles.length === 0) return false;
  const haystack = ingredientTokens(recipe);
  return needles.every((needle) => haystack.some((token) => sameIngredient(token, needle)));
}

function ingredientLine(recipe: Recipe) {
  return recipe.ingredients.map((ingredient) => `${ingredient.item} ${ingredient.display}`).join(" ").toLowerCase();
}

export function matchesAvoid(recipe: Recipe, term: string) {
  const text = ingredientLine(recipe);
  if (term === "butter") return /\bbutter\b/.test(text.replace(/\b(peanut|almond|cashew|sunflower|nut) butter\b/g, ""));
  if (term === "cream") return /\bcream\b/.test(text.replace(/\bcoconut cream\b/g, ""));
  if (term === "flour") return /\bflour\b/.test(text.replace(/\b(almond|coconut|oat|rice) flour\b/g, ""));
  return matchesIngredient(recipe, term);
}

function matchesDiet(recipe: Recipe, diets: DietTag[]) {
  if (diets.length === 0) return true;
  if (diets.includes("gluten-free option") && !recipe.diet_tags.includes("gluten-free option")) return false;
  const patterns = diets.filter((tag) => tag !== "gluten-free option");
  if (patterns.length === 0) return true;
  return patterns.some((tag) => {
    if (recipe.diet_tags.includes(tag)) return true;
    if (tag === "vegetarian" && recipe.diet_tags.includes("vegan")) return true;
    if (tag === "pescatarian" && recipe.diet_tags.some((item) => item === "vegetarian" || item === "vegan")) return true;
    return false;
  });
}

function matchesSearch(recipe: Recipe, query: string) {
  const parts = tokens(query);
  if (parts.length === 0) return true;
  const haystack = normalize(
    `${recipe.title} ${recipe.ingredients.map((ingredient) => `${ingredient.item} ${ingredient.display}`).join(" ")}`,
  );
  return parts.every((part) => haystack.includes(part));
}

function matchesStage(stage: Stage, selected: StageFilter[]) {
  if (selected.length === 0) return true;
  return selected.some((item) => stage === item || stage === "both");
}

function matchesNutrient(recipe: Recipe, nutrients: Nutrient[]) {
  if (nutrients.length === 0) return true;
  const text = recipe.nutrition_highlights.join(" ");
  return nutrients.some((nutrient) => NUTRIENT_PATTERN[nutrient].test(text));
}

export function activeFilterCount(query: RecipeQuery) {
  return (
    (query.maxMinutes === null ? 0 : 1) +
    (query.maxCost === null ? 0 : 1) +
    query.meals.length +
    query.efforts.length +
    query.diets.length +
    query.nutrients.length +
    query.stages.length +
    (query.wicOnly ? 1 : 0) +
    (query.includeIngredient.trim() ? 1 : 0) +
    (query.excludeIngredient.trim() ? 1 : 0) +
    query.have.filter((item) => item.trim()).length
  );
}

export function filterRecipes(recipes: Recipe[], query: RecipeQuery) {
  const have = query.have.map((item) => item.trim()).filter(Boolean);

  const matched = recipes
    .map((recipe, index) => ({ recipe, index }))
    .filter(({ recipe }) => {
      if (!matchesSearch(recipe, query.search)) return false;
      if (query.maxMinutes !== null && recipe.total_min > query.maxMinutes) return false;
      if (query.maxCost !== null && costPerServing(recipe.total_cost, recipe.servings) > query.maxCost) return false;
      if (query.meals.length > 0 && !query.meals.some((meal) => recipe.meals.includes(meal))) return false;
      if (query.efforts.length > 0 && !query.efforts.some((tag) => recipe.effort_tags.includes(tag))) return false;
      if (!matchesDiet(recipe, query.diets)) return false;
      if (!matchesNutrient(recipe, query.nutrients)) return false;
      if (!matchesStage(recipe.stage, query.stages)) return false;
      if (query.wicOnly && recipe.wic_friendly !== true) return false;
      if (query.includeIngredient.trim() && !matchesIngredient(recipe, query.includeIngredient)) return false;
      if (query.excludeIngredient.trim() && matchesIngredient(recipe, query.excludeIngredient)) return false;
      if (query.avoidTerms.some((term) => matchesAvoid(recipe, term))) return false;
      if (have.some((item) => !matchesIngredient(recipe, item))) return false;
      return true;
    });

  matched.sort((a, b) => {
    if (query.sort === "quickest") return a.recipe.total_min - b.recipe.total_min || a.index - b.index;
    if (query.sort === "cheapest") {
      const costA = costPerServing(a.recipe.total_cost, a.recipe.servings);
      const costB = costPerServing(b.recipe.total_cost, b.recipe.servings);
      return costA - costB || a.index - b.index;
    }
    if (query.sort === "newest") return b.index - a.index;
    return a.index - b.index;
  });

  return matched.map((item) => item.recipe);
}
