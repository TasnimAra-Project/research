import type { Food, Ingredient } from "@/data/types";
import { matchFood } from "@/lib/safety/check";

const UNITS = [
  "cups",
  "cup",
  "tablespoons",
  "tablespoon",
  "tbsp",
  "teaspoons",
  "teaspoon",
  "tsp",
  "ounces",
  "ounce",
  "oz",
  "pounds",
  "pound",
  "lb",
  "grams",
  "gram",
  "g",
  "kilograms",
  "kg",
  "milliliters",
  "milliliter",
  "ml",
  "liters",
  "liter",
  "l",
  "cloves",
  "clove",
  "slices",
  "slice",
  "large",
  "medium",
  "small",
];

function amountNumber(raw: string) {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function ingredientFromLine(line: string, foods: Food[]): Ingredient | null {
  const display = line.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (display.length < 2) return null;
  const match = display.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/);
  let amount: number | null = null;
  let unit: string | null = null;
  let item = display;
  if (match) {
    amount = amountNumber(match[1]);
    const rest = match[2];
    const first = rest.split(/\s+/)[0]?.toLowerCase().replace(/[.,]$/, "") ?? "";
    if (UNITS.includes(first)) {
      unit = first;
      item = rest.slice(first.length).trim();
    } else {
      item = rest;
    }
  }
  const food = matchFood(foods, item);
  return {
    display,
    food_slug: food?.slug ?? null,
    amount,
    unit,
    item: item.replace(/\(optional\)/i, "").trim() || display,
    optional: /\boptional\b/i.test(display),
    alternate_food_slug: null,
  };
}
