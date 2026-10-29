import type { Recipe } from "@/data/types";
import { NUTRIENT_TARGETS, type NutrientId } from "@/data/nutrient-targets";

const NUTRIENT_IDS: Record<NutrientId, number[]> = {
  protein: [1003],
  calcium: [1087],
  iron: [1089],
  folate: [1190, 1177],
  choline: [1180],
  iodine: [1100],
  dha: [621],
};

const GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

const PIECES: Record<string, number> = {
  egg: 50,
  eggs: 50,
  clove: 5,
  cloves: 5,
  slice: 30,
  slices: 30,
};

type FdcFood = {
  foodNutrients?: { nutrientId?: number; nutrientName?: string; value?: number; unitName?: string }[];
};

const cache = new Map<string, Partial<Record<NutrientId, number>> | null>();
let hitLimit = false;

function pieceGrams(amount: number, item: string) {
  const word = item.toLowerCase().split(/\s+/)[0]?.replace(/[.,]$/, "") ?? "";
  const weight = PIECES[word];
  if (!weight) return null;
  return amount * weight;
}

function gramsFor(amount: number | null, unit: string | null, item: string) {
  if (amount === null || amount <= 0) return null;
  if (!unit) return pieceGrams(amount, item);
  const factor = GRAMS[unit.toLowerCase()];
  if (factor) return amount * factor;
  if (/^(large|medium|small)$/.test(unit.toLowerCase())) return pieceGrams(amount, item);
  return null;
}

function per100g(food: FdcFood) {
  const found: Partial<Record<NutrientId, number>> = {};
  for (const nutrient of NUTRIENT_TARGETS) {
    const row = food.foodNutrients?.find((item) => {
      if (item.nutrientId && NUTRIENT_IDS[nutrient.id].includes(item.nutrientId)) return true;
      return nutrient.id === "dha" && /22:6|dha/i.test(item.nutrientName ?? "");
    });
    if (!row || typeof row.value !== "number") continue;
    const unit = (row.unitName ?? "").toUpperCase();
    let value = row.value;
    if (nutrient.id === "dha" && unit === "G") value *= 1000;
    found[nutrient.id] = value;
  }
  return found;
}

async function lookup(name: string, apiKey: string) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", name);
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  if (hitLimit) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (response.status === 429) {
    hitLimit = true;
    return null;
  }
  if (!response.ok) {
    cache.set(key, null);
    return null;
  }
  const payload = (await response.json()) as { foods?: FdcFood[] };
  const food = payload.foods?.[0];
  const parsed = food ? per100g(food) : null;
  cache.set(key, parsed);
  return parsed;
}

function emptyTotals(): Record<NutrientId, number> {
  return { folate: 0, iron: 0, choline: 0, iodine: 0, calcium: 0, dha: 0, protein: 0 };
}

async function eachLimited<T>(items: T[], worker: (item: T) => Promise<void>) {
  let index = 0;
  const runners = Array.from({ length: Math.min(4, items.length) }, async () => {
    while (index < items.length && !hitLimit) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

export async function estimateRecipes(recipes: Recipe[]) {
  const totals = emptyTotals();
  const apiKey = process.env.USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
  const skipped: string[] = [];
  let matched = 0;
  const jobs: { name: string; share: number }[] = [];
  for (const recipe of recipes) {
    const servings = recipe.servings > 0 ? recipe.servings : 1;
    for (const ingredient of recipe.ingredients) {
      const name = ingredient.item.trim();
      if (!name) continue;
      const grams = gramsFor(ingredient.amount, ingredient.unit, name);
      if (grams === null) {
        if (!skipped.includes(name)) skipped.push(name);
        continue;
      }
      jobs.push({ name, share: grams / 100 / servings });
    }
  }
  if (jobs.length === 0) {
    return { totals, calculated: recipes.length === 0, skipped, message: null as string | null };
  }
  hitLimit = false;
  await eachLimited(jobs, async (job) => {
    const nutrients = await lookup(job.name, apiKey);
    if (!nutrients) {
      if (!skipped.includes(job.name)) skipped.push(job.name);
      return;
    }
    matched += 1;
    for (const nutrient of NUTRIENT_TARGETS) {
      const per = nutrients[nutrient.id];
      if (typeof per === "number") totals[nutrient.id] += per * job.share;
    }
  });
  for (const nutrient of NUTRIENT_TARGETS) totals[nutrient.id] = Math.round(totals[nutrient.id] * 10) / 10;
  if (matched === 0) {
    return {
      totals,
      calculated: false,
      skipped: skipped.slice(0, 8),
      message: hitLimit
        ? "USDA is limiting requests right now. Add your own FoodData Central key and restart the server."
        : "USDA did not return nutrients for these ingredients.",
    };
  }
  const ownKey = Boolean(process.env.USDA_FDC_API_KEY?.trim());
  const limitNote = hitLimit ? " USDA limited some foods, so they were left out." : "";
  const keyNote = ownKey ? "" : " A public USDA demo key is in use until you add your own.";
  return {
    totals,
    calculated: matched > 0,
    skipped: skipped.slice(0, 8),
    message: `Cup, spoon, and milliliter amounts use a kitchen weight, then USDA nutrients per 100 g. A count such as eggs uses a kitchen weight. A missing food is left out.${limitNote}${keyNote}`,
  };
}
