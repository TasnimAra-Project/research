import type { Food, Recipe, Verdict } from "@/data/types";

const RANK: Verdict[] = ["avoid", "limit", "okay_if_prepared", "okay"];

/**
 * A recipe stays "unknown" while any linked food has no verdict.
 * Unknown wins over Okay so a reviewed ingredient cannot clear the rest of the dish.
 */
export function verdictForRecipe(recipe: Recipe, foods: Food[]): Verdict {
  const bySlug = new Map(foods.map((food) => [food.slug, food]));
  const slugs = recipe.ingredients.flatMap((ingredient) =>
    [ingredient.food_slug, ingredient.alternate_food_slug].filter(
      (slug): slug is string => Boolean(slug),
    ),
  );

  if (slugs.length === 0) return "unknown";

  const verdicts = slugs.map((slug) => bySlug.get(slug)?.verdict ?? "unknown");
  if (verdicts.some((verdict) => verdict === "unknown")) return "unknown";

  for (const verdict of RANK) {
    if (verdicts.includes(verdict)) return verdict;
  }

  return "unknown";
}

export function foodBySlug(foods: Food[], slug: string | null) {
  if (!slug) return null;
  return foods.find((food) => food.slug === slug) ?? null;
}
