import type { Food } from "@/data/types";
import { matchFood, parseIngredientLine } from "@/lib/safety/check";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function foodsInText(text: string, foods: Food[]) {
  const hay = ` ${normalize(text)} `;
  const hits: { food: Food; index: number; length: number }[] = [];
  for (const food of foods) {
    for (const name of [food.name, ...food.aliases]) {
      const needle = normalize(name);
      if (needle.length < 3) continue;
      const match = new RegExp(`\\b${escapeRegExp(needle)}\\b`).exec(hay);
      if (!match) continue;
      hits.push({ food, index: match.index, length: needle.length });
    }
  }
  hits.sort((a, b) => b.length - a.length || a.index - b.index);
  const spans: [number, number][] = [];
  const seen = new Set<string>();
  const found: Food[] = [];
  for (const hit of hits) {
    if (seen.has(hit.food.slug)) continue;
    const end = hit.index + hit.length;
    if (spans.some(([start, stop]) => hit.index < stop && end > start)) continue;
    spans.push([hit.index, end]);
    seen.add(hit.food.slug);
    found.push(hit.food);
  }
  return found;
}

export function recipeFromPicture(text: string, foods: Food[]) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^[\d]+[.)]\s*/, "").trim())
    .filter(Boolean);
  const ingredients: { amount: string | null; unit: string | null; item: string }[] = [];
  const steps: string[] = [];
  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    const looksLikeIngredient =
      parsed.amount !== null || /\b(cup|cups|tbsp|tsp|ounce|ounces|oz|lb|pound|pounds|clove|cloves|can|cans)\b/i.test(line);
    if (looksLikeIngredient && line.length < 160) ingredients.push(parsed);
    else if (line.length > 30) steps.push(line);
  }
  const covered = new Set(ingredients.map((line) => matchFood(foods, line.item)?.slug).filter((slug): slug is string => Boolean(slug)));
  for (const food of foodsInText(text, foods)) {
    if (covered.has(food.slug)) continue;
    ingredients.push({ amount: null, unit: null, item: food.name });
    covered.add(food.slug);
  }
  const title = lines[0] && lines[0].length < 80 ? lines[0] : "Recipe from a picture";
  return { title, ingredients, steps };
}
