"use client";

import { useEffect } from "react";
import type { Recipe } from "@/data/types";
import { rememberOffline } from "@/lib/offline/store";

export function RememberRecipes({ recipes }: { recipes: Recipe[] }) {
  useEffect(() => {
    void rememberOffline(
      "recipes",
      recipes.map((recipe) => ({
        slug: recipe.slug,
        title: recipe.title,
        ingredients: recipe.ingredients.map((item) => item.display),
        steps: recipe.steps.map((step) => step.text),
      })),
    );
  }, [recipes]);
  return null;
}
