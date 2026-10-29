import type { Recipe } from "@/data/types";
import type { Profile } from "@/lib/profile/types";
import { NUTRIENT_TARGETS } from "@/data/nutrient-targets";
import { profileToQuery } from "@/lib/profile/preferences";
import { filterRecipes } from "@/lib/recipes/query";
import { costPerServing } from "@/lib/format";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const PLAN_MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type PlanMeal = (typeof PLAN_MEALS)[number];
export type PlanSlot = { day: number; meal: PlanMeal; recipeSlug: string | null };

const HIGHLIGHT: Record<string, RegExp> = {
  folate: /folate/i,
  iron: /\biron\b/i,
  choline: /choline/i,
  iodine: /iodine/i,
  calcium: /calcium/i,
  dha: /dha|omega-3/i,
  protein: /protein/i,
};

export function emptyWeek(): PlanSlot[] {
  const slots: PlanSlot[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (const meal of PLAN_MEALS) slots.push({ day, meal, recipeSlug: null });
  }
  return slots;
}

export function slotKey(day: number, meal: PlanMeal) {
  return `${day}-${meal}`;
}

function foodKeys(recipe: Recipe) {
  return recipe.ingredients.map((item) => item.food_slug ?? item.item.toLowerCase());
}

function poolFor(recipes: Recipe[], profile: Profile | null) {
  const query = profileToQuery(profile);
  query.maxMinutes = null;
  query.maxCost = null;
  const matched = filterRecipes(recipes, query);
  return matched.length > 0 ? matched : recipes;
}

function fitsTime(recipe: Recipe, day: number, meal: PlanMeal, profile: Profile | null) {
  const weeknight = day < 5 && (meal === "lunch" || meal === "dinner");
  const cap = profile?.weeknightMinutes ?? (profile?.skill === "starting" ? 30 : null);
  if (!weeknight || cap === null) return true;
  return recipe.total_min <= cap;
}

function scoreRecipe(recipe: Recipe, meal: PlanMeal, day: number, used: Map<string, number>, foods: Map<string, number>, sameDay: Set<string>, salt: number) {
  let score = recipe.meals.includes(meal) ? 8 : 0;
  const ahead = recipe.effort_tags.includes("make-ahead");
  if (day === 6 && ahead) score += 6;
  const times = used.get(recipe.slug) ?? 0;
  if (times === 1 && ahead) score += 4;
  if (times === 1 && !ahead) score -= 6;
  if (times >= 2) score -= 30;
  if (sameDay.has(recipe.slug)) score -= 40;
  for (const key of foodKeys(recipe)) {
    if ((foods.get(key) ?? 0) > 0) score += 3;
  }
  for (const nutrient of NUTRIENT_TARGETS) {
    const pattern = HIGHLIGHT[nutrient.id];
    if (pattern && recipe.nutrition_highlights.some((line) => pattern.test(line))) score += 1;
  }
  score += (hash(`${recipe.slug}:${salt}`) % 5) / 10;
  return score;
}

function hash(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total = (total * 33 + value.charCodeAt(index)) >>> 0;
  return total;
}

function remember(recipe: Recipe, used: Map<string, number>, foods: Map<string, number>) {
  used.set(recipe.slug, (used.get(recipe.slug) ?? 0) + 1);
  for (const key of foodKeys(recipe)) foods.set(key, (foods.get(key) ?? 0) + 1);
}

function pick(options: Recipe[], meal: PlanMeal, day: number, profile: Profile | null, used: Map<string, number>, foods: Map<string, number>, sameDay: Set<string>, salt: number, exclude: string | null) {
  const budget = profile?.budgetPerServing ?? null;
  const ranked = options
    .filter((recipe) => recipe.slug !== exclude)
    .map((recipe) => {
      const cost = costPerServing(recipe.total_cost, recipe.servings);
      const withinBudget = budget === null || cost <= budget;
      const withinTime = fitsTime(recipe, day, meal, profile);
      return { recipe, withinBudget, withinTime, score: scoreRecipe(recipe, meal, day, used, foods, sameDay, salt) };
    })
    .sort((a, b) => Number(b.withinTime) - Number(a.withinTime) || Number(b.withinBudget) - Number(a.withinBudget) || b.score - a.score);
  return ranked[0]?.recipe ?? null;
}

export function fillWeek(recipes: Recipe[], profile: Profile | null, salt = 1) {
  const options = poolFor(recipes, profile);
  const used = new Map<string, number>();
  const foods = new Map<string, number>();
  const sameDay = new Set<string>();
  let currentDay = -1;
  return emptyWeek().map((slot) => {
    if (slot.day !== currentDay) {
      currentDay = slot.day;
      sameDay.clear();
    }
    const recipe = pick(options, slot.meal, slot.day, profile, used, foods, sameDay, salt + slot.day * 4, null);
    if (recipe) {
      remember(recipe, used, foods);
      sameDay.add(recipe.slug);
    }
    return { ...slot, recipeSlug: recipe?.slug ?? null };
  });
}

export function regenerateMeal(slots: PlanSlot[], recipes: Recipe[], profile: Profile | null, day: number, meal: PlanMeal, salt: number) {
  const options = poolFor(recipes, profile);
  const current = slots.find((slot) => slot.day === day && slot.meal === meal)?.recipeSlug ?? null;
  const used = new Map<string, number>();
  const foods = new Map<string, number>();
  const sameDay = new Set<string>();
  for (const slot of slots) {
    if (slot.day === day && slot.meal === meal) continue;
    const recipe = recipes.find((item) => item.slug === slot.recipeSlug);
    if (!recipe) continue;
    remember(recipe, used, foods);
    if (slot.day === day && slot.recipeSlug) sameDay.add(slot.recipeSlug);
  }
  const recipe = pick(options, meal, day, profile, used, foods, sameDay, salt, current);
  return slots.map((slot) => (slot.day === day && slot.meal === meal ? { ...slot, recipeSlug: recipe?.slug ?? slot.recipeSlug } : slot));
}

export function regenerateDay(slots: PlanSlot[], recipes: Recipe[], profile: Profile | null, day: number, salt: number) {
  let next = slots.map((slot) => (slot.day === day ? { ...slot, recipeSlug: null } : slot));
  for (const meal of PLAN_MEALS) next = regenerateMeal(next, recipes, profile, day, meal, salt + meal.length);
  return next;
}

export function weekTotals(slots: PlanSlot[], recipes: Recipe[]) {
  let cost = 0;
  let minutes = 0;
  let approximate = false;
  for (const slot of slots) {
    const recipe = recipes.find((item) => item.slug === slot.recipeSlug);
    if (!recipe) continue;
    cost += costPerServing(recipe.total_cost, recipe.servings);
    minutes += recipe.total_min;
    if (recipe.cost_is_approximate) approximate = true;
  }
  return { cost: Math.round(cost * 100) / 100, minutes, approximate };
}

export function batchSuggestions(slots: PlanSlot[], recipes: Recipe[]) {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    if (!slot.recipeSlug) continue;
    counts.set(slot.recipeSlug, (counts.get(slot.recipeSlug) ?? 0) + 1);
  }
  return recipes.filter((recipe) => {
    const count = counts.get(recipe.slug) ?? 0;
    if (count === 0) return false;
    return recipe.effort_tags.includes("make-ahead") || count > 1;
  });
}
