import { aisleFor } from "@/data/aisles";
import { asinFor } from "@/data/asins";
import type { Food, Ingredient, Recipe, Verdict } from "@/data/types";
import { foodBySlug } from "@/lib/safety";

export type GroceryItem = {
  id: string;
  merge_key: string;
  food_slug: string | null;
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: string;
  included: boolean;
  got: boolean;
  optional: boolean;
  sources: string[];
};

export type PantryItem = {
  id: string;
  food_slug: string | null;
  name: string;
  purchased_on: string | null;
  expires_on: string | null;
};

export type WeekRecipe = {
  id: string;
  recipe_slug: string;
  position: number;
};

export type DraftLine = {
  mergeKey: string;
  foodSlug: string | null;
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: string;
  optional: boolean;
  sources: string[];
};

const UNIT_CANON: Record<string, string> = {
  cup: "cup",
  cups: "cup",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tbsp: "tablespoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  tsp: "teaspoon",
  ounce: "ounce",
  ounces: "ounce",
  oz: "ounce",
  pound: "pound",
  pounds: "pound",
  lb: "pound",
  lbs: "pound",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
};

const UNIT_PLURAL: Record<string, string> = {
  cup: "cups",
  tablespoon: "tablespoons",
  teaspoon: "teaspoons",
  ounce: "ounces",
  pound: "pounds",
  clove: "cloves",
  can: "cans",
};

const SWAP_VERDICTS: Verdict[] = ["avoid", "limit", "okay_if_prepared"];

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalUnit(unit: string | null) {
  if (!unit) return null;
  const cleaned = unit.toLowerCase().replace(/\./g, "").trim();
  return UNIT_CANON[cleaned] ?? cleaned;
}

export function formatAmount(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function pluralUnit(unit: string, amount: number) {
  if (amount === 1) return unit;
  return UNIT_PLURAL[unit] ?? unit;
}

export function formatGroceryLine(item: {
  amount: number | null;
  unit: string | null;
  name: string;
  optional?: boolean;
}) {
  const unit = item.unit ? pluralUnit(item.unit, item.amount ?? 1) : "";
  const text = [item.amount === null ? "" : formatAmount(item.amount), unit, item.name].filter(Boolean).join(" ");
  return item.optional ? `${text} (optional)` : text;
}

export function safeVersionFor(food: Food | null) {
  if (!food?.safe_version) return null;
  if (!SWAP_VERDICTS.includes(food.verdict)) return null;
  return food.safe_version;
}

export function matchFood(foods: Food[], name: string) {
  const needle = normalizeName(name);
  if (!needle) return null;
  return (
    foods.find(
      (food) => normalizeName(food.name) === needle || food.aliases.some((alias) => normalizeName(alias) === needle),
    ) ?? null
  );
}

export function pantryHit(pantry: PantryItem[], food: Food | null, name: string, today: string) {
  const names = new Set([normalizeName(name), ...(food ? [food.name, ...food.aliases].map(normalizeName) : [])]);
  return (
    pantry.find((item) => {
      const same =
        (food?.slug && item.food_slug === food.slug) || names.has(normalizeName(item.name));
      if (!same) return false;
      if (item.expires_on && item.expires_on < today) return false;
      return true;
    }) ?? null
  );
}

export function draftFromIngredient(ingredient: Ingredient, foods: Food[], source: string): DraftLine {
  const food = foodBySlug(foods, ingredient.food_slug);
  const unit = canonicalUnit(ingredient.unit);
  const name = food?.name ?? ingredient.item;
  const slug = food?.slug ?? null;
  const measurable = ingredient.amount !== null;
  return {
    mergeKey: `${slug ?? normalizeName(name)}|${unit ?? ""}|${measurable ? "qty" : "plain"}`,
    foodSlug: slug,
    name,
    amount: ingredient.amount,
    unit,
    aisle: aisleFor(slug),
    optional: ingredient.optional,
    sources: [source],
  };
}

export function mergeDrafts(lines: DraftLine[]) {
  const map = new Map<string, DraftLine>();
  for (const line of lines) {
    const current = map.get(line.mergeKey);
    if (!current) {
      map.set(line.mergeKey, { ...line, sources: [...line.sources] });
      continue;
    }
    if (current.amount !== null && line.amount !== null) {
      current.amount = Math.round((current.amount + line.amount) * 100) / 100;
    } else if (current.amount === null) {
      current.amount = line.amount;
    }
    current.optional = current.optional && line.optional;
    for (const source of line.sources) {
      if (!current.sources.includes(source)) current.sources.push(source);
    }
  }
  const merged = [...map.values()];
  const measured = new Set(
    merged.filter((line) => line.amount !== null).map((line) => line.foodSlug ?? normalizeName(line.name)),
  );
  return merged.filter((line) => line.amount !== null || !measured.has(line.foodSlug ?? normalizeName(line.name)));
}

export function collapseShoppingItems(items: GroceryItem[]) {
  const measured = new Set(
    items.filter((item) => item.amount !== null).map((item) => item.food_slug ?? normalizeName(item.name)),
  );
  return items.filter((item) => item.amount !== null || !measured.has(item.food_slug ?? normalizeName(item.name)));
}

export function combineWithExisting(existing: GroceryItem, draft: DraftLine): GroceryItem {
  const amount =
    existing.amount !== null && draft.amount !== null
      ? Math.round((existing.amount + draft.amount) * 100) / 100
      : (existing.amount ?? draft.amount);
  const sources = [...existing.sources];
  for (const source of draft.sources) {
    if (!sources.includes(source)) sources.push(source);
  }
  return {
    ...existing,
    amount,
    optional: existing.optional && draft.optional,
    sources,
    included: true,
    got: false,
  };
}

export type SendLine = {
  id: string;
  aisle: string;
  text: string;
  foodSlug: string | null;
  swapped: boolean;
};

export function linesToSend(items: GroceryItem[], foods: Food[], pantry: PantryItem[], today = todayISO()) {
  const skipped: string[] = [];
  const lines: SendLine[] = [];

  for (const item of items) {
    if (item.got) continue;
    const food = foodBySlug(foods, item.food_slug);
    const held = pantryHit(pantry, food, item.name, today);
    if (held) {
      skipped.push(
        held.expires_on
          ? `${item.name} is in your pantry until ${held.expires_on}.`
          : `${item.name} is in your pantry.`,
      );
      continue;
    }
    const safe = safeVersionFor(food);
    const base = formatGroceryLine(item);
    lines.push({
      id: item.id,
      aisle: item.aisle,
      foodSlug: item.food_slug,
      swapped: Boolean(safe),
      text: safe ? `${base}. Safe version: ${safe}` : base,
    });
  }

  return { lines, skipped };
}

export function sendText(lines: SendLine[]) {
  const groups = new Map<string, string[]>();
  for (const line of lines) {
    const group = groups.get(line.aisle) ?? [];
    group.push(line.text);
    groups.set(line.aisle, group);
  }
  const body = [...groups.entries()]
    .map(([aisle, rows]) => `${aisle}\n${rows.map((row) => `- ${row}`).join("\n")}`)
    .join("\n\n");
  return `Families Eat Well shopping list\n\n${body}\n\nYou check out on the store's site. Families Eat Well does not take payment.`;
}

export function amazonCartItems(lines: SendLine[]) {
  const byAsin = new Map<string, number>();
  const missing: string[] = [];
  for (const line of lines) {
    const mapped = asinFor(line.foodSlug);
    if (!mapped) {
      missing.push(line.text);
      continue;
    }
    byAsin.set(mapped.asin, (byAsin.get(mapped.asin) ?? 0) + mapped.quantity);
  }
  return {
    items: [...byAsin.entries()].map(([asin, quantity]) => ({ asin, quantity })),
    missing,
  };
}

export function draftsForRecipes(recipes: Recipe[], foods: Food[]) {
  return recipes.flatMap((recipe) =>
    recipe.ingredients.map((ingredient) => draftFromIngredient(ingredient, foods, recipe.title)),
  );
}
