"use server";

import { seedData } from "@/data";
import type { Ingredient, Step } from "@/data/types";
import { NUTRIENT_TARGETS, type NutrientId } from "@/data/nutrient-targets";
import { estimateRecipes } from "@/lib/nutrition/fdc";
import { ingredientFromLine } from "@/lib/recipes/lines";

export type PageDraft = {
  title: string;
  sourceUrl: string;
  servings: number;
  totalMin: number;
  ingredients: Ingredient[];
  steps: Step[];
  pageNutrition: Partial<Record<NutrientId, number>>;
};

const PAGE_FIELDS: { id: NutrientId; keys: string[]; unit: "g" | "mg" | "mcg" }[] = [
  { id: "protein", keys: ["proteinContent", "protein"], unit: "g" },
  { id: "iron", keys: ["ironContent", "iron"], unit: "mg" },
  { id: "calcium", keys: ["calciumContent", "calcium"], unit: "mg" },
  { id: "folate", keys: ["folateContent", "folate"], unit: "mcg" },
  { id: "choline", keys: ["cholineContent", "choline"], unit: "mg" },
  { id: "iodine", keys: ["iodineContent", "iodine"], unit: "mcg" },
  { id: "dha", keys: ["dhaContent", "dha"], unit: "mg" },
];

function allowed(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|0\.0\.0\.0)/.test(host)) return false;
  return true;
}

function minutesFrom(value: unknown) {
  if (typeof value !== "string") return 0;
  const iso = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso && (iso[1] || iso[2])) return Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0);
  const minutes = value.match(/(\d+)\s*(?:min|minute)/i);
  return minutes ? Number(minutes[1]) : 0;
}

function servingsFrom(value: unknown) {
  const text = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  const match = text.match(/\d+/);
  const count = match ? Number(match[0]) : 1;
  return count > 0 && count < 100 ? count : 1;
}

function plain(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function stepText(value: unknown): string[] {
  if (typeof value === "string") return [plain(value)].filter((item) => item.length > 1);
  if (!Array.isArray(value)) {
    if (value && typeof value === "object" && "text" in value) return stepText((value as { text?: unknown }).text);
    if (value && typeof value === "object" && "itemListElement" in value) {
      return stepText((value as { itemListElement?: unknown }).itemListElement);
    }
    return [];
  }
  return value.flatMap((item) => stepText(item));
}

function readAmount(value: unknown, unit: "g" | "mg" | "mcg") {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  const match = text.match(/([\d.]+)\s*(mcg|µg|ug|mg|g)?/i);
  if (!match) return null;
  let amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const found = (match[2] ?? unit).toLowerCase().replace("µ", "u");
  const from = found === "ug" ? "mcg" : found;
  if (from === "g" && unit === "mg") amount *= 1000;
  if (from === "g" && unit === "mcg") amount *= 1_000_000;
  if (from === "mg" && unit === "mcg") amount *= 1000;
  if (from === "mg" && unit === "g") amount /= 1000;
  if (from === "mcg" && unit === "mg") amount /= 1000;
  if (from === "mcg" && unit === "g") amount /= 1_000_000;
  return Math.round(amount * 10) / 10;
}

function pageNutrition(record: Record<string, unknown>) {
  const nutrition = record.nutrition;
  const source = nutrition && typeof nutrition === "object" ? (nutrition as Record<string, unknown>) : record;
  const found: Partial<Record<NutrientId, number>> = {};
  for (const field of PAGE_FIELDS) {
    for (const key of field.keys) {
      const amount = readAmount(source[key], field.unit);
      if (amount !== null) {
        found[field.id] = amount;
        break;
      }
    }
  }
  return found;
}

function collectRecipes(node: unknown, found: Record<string, unknown>[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectRecipes(item, found);
    return;
  }
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  const types = (Array.isArray(type) ? type : [type]).map((item) => String(item).toLowerCase());
  if (types.includes("recipe")) found.push(record);
  if (record["@graph"]) collectRecipes(record["@graph"], found);
}

export async function previewRecipeLink(raw: string): Promise<{ error: string } | PageDraft> {
  let target: URL;
  try {
    target = new URL(raw.trim());
  } catch {
    return { error: "Enter a full recipe link, starting with https://." };
  }
  if (!allowed(target)) return { error: "That link cannot be read." };
  let html = "";
  try {
    const response = await fetch(target, {
      headers: { "user-agent": "FamiliesEatWell/1.0", accept: "text/html" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    const finalUrl = new URL(response.url);
    if (!allowed(finalUrl)) return { error: "That link cannot be read." };
    if (!response.ok) return { error: "That page could not be opened." };
    html = (await response.text()).slice(0, 1_500_000);
  } catch {
    return { error: "That page could not be opened." };
  }
  const recipes: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectRecipes(JSON.parse(match[1]), recipes);
    } catch {
      continue;
    }
  }
  const recipe = recipes[0];
  if (!recipe) return { error: "That page does not publish a recipe. Add the ingredients yourself." };
  const title = plain(String(recipe.name ?? "")).slice(0, 120);
  if (!title) return { error: "That page does not publish a recipe. Add the ingredients yourself." };
  const lines = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.map((item) => plain(String(item))) : [];
  const ingredients = lines.map((line) => ingredientFromLine(line, seedData.foods)).filter((item) => item !== null);
  if (ingredients.length === 0) return { error: "That recipe has no ingredient list. Add the ingredients yourself." };
  const steps = stepText(recipe.recipeInstructions).slice(0, 30).map((text) => ({ text, timer_seconds: null }));
  return {
    title,
    sourceUrl: target.toString(),
    servings: servingsFrom(recipe.recipeYield),
    totalMin: minutesFrom(recipe.totalTime) || minutesFrom(recipe.cookTime),
    ingredients,
    steps,
    pageNutrition: pageNutrition(recipe),
  };
}

export async function measureRecipe(ingredients: Ingredient[], servings: number) {
  const safeServings = servings > 0 ? servings : 1;
  const result = await estimateRecipes([
    {
      slug: "draft",
      title: "Draft",
      description: null,
      meal: "dinner",
      meals: ["dinner"],
      servings: safeServings,
      servings_label: null,
      prep_min: 0,
      cook_min: 0,
      total_min: 0,
      inactive_time_note: null,
      total_cost: 0,
      cost_is_approximate: true,
      cost_store: null,
      cost_checked_date: null,
      effort_tags: [],
      diet_tags: [],
      wic_friendly: null,
      stage: "both",
      chef_tips: [],
      superfood_spotlight: null,
      nutrition_highlights: [],
      benefits: [],
      evidence_links: [],
      photo_url: null,
      reviewed_by: null,
      reviewed_date: null,
      safety_note: null,
      source_document: "Added by you",
      ingredients,
      steps: [],
    },
  ]);
  const totals = { ...result.totals };
  return { totals, calculated: result.calculated, message: result.message, names: NUTRIENT_TARGETS.map((item) => item.id) };
}
