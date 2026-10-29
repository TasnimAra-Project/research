"use server";

import { seedData } from "@/data";
import { estimateRecipes } from "@/lib/nutrition/fdc";

export async function nutritionForSlugs(slugs: string[]) {
  const recipes = slugs
    .filter(Boolean)
    .map((slug) => seedData.recipes.find((recipe) => recipe.slug === slug))
    .filter((recipe) => recipe !== undefined);
  return estimateRecipes(recipes);
}
