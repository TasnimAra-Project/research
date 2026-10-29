"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeFilters } from "@/components/recipes/RecipeFilters";
import { RecipePhoto } from "@/components/recipes/RecipePhoto";
import { RecipePoster } from "@/components/ui/RecipePoster";
import type { Food, Recipe } from "@/data/types";
import { emptyRecipeQuery, filterRecipes, type RecipeQuery } from "@/lib/recipes/query";
import { badgeVerdict, checkRecipe } from "@/lib/safety/check";
import { SafetyBadge } from "@/components/ui/SafetyBadge";

export function RecipeBoard({
  recipes,
  foods,
  selectedSlug,
  preferences = emptyRecipeQuery,
  feedLabel,
  avoidNote,
}: {
  recipes: Recipe[];
  foods: Food[];
  selectedSlug: string | null;
  preferences?: RecipeQuery;
  feedLabel?: string | null;
  avoidNote?: string | null;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState<RecipeQuery>(preferences);
  const selected = recipes.find((recipe) => recipe.slug === selectedSlug) ?? null;
  const visible = useMemo(() => filterRecipes(recipes, query), [recipes, query]);

  useEffect(() => {
    if (selected) closeRef.current?.focus();
  }, [selected]);

  function openRecipe(slug: string) {
    router.push(`/recipes?recipe=${slug}`, { scroll: false });
  }

  function closeRecipe() {
    router.push("/recipes", { scroll: false });
  }

  return (
    <main id="main" className={selected ? "flex h-full min-h-0 overflow-hidden" : "min-h-full"}>
      <div className={`min-h-0 min-w-0 flex-1 px-4 py-6 sm:px-6 ${selected ? "hidden overflow-y-auto overscroll-contain md:block" : ""}`}>
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold">Recipes</h1>
          {feedLabel ? <p className="mt-2 text-base">{feedLabel}</p> : null}
          {avoidNote ? <p className="mt-1 text-base">{avoidNote}</p> : null}
        </header>
        <RecipeFilters query={query} onChange={setQuery} baseline={preferences} />
        <p className="mb-4 text-base" aria-live="polite">
          {visible.length === 1 ? `1 of ${recipes.length} recipes` : `${visible.length} of ${recipes.length} recipes`}
        </p>
        {visible.length === 0 ? (
          <p className="rounded-[18px] bg-white px-4 py-6 text-base">
            No recipes match these filters.
          </p>
        ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((recipe) => {
            const isSelected = recipe.slug === selected?.slug;
            const checked = checkRecipe(recipe, foods);
            return (
              <li key={recipe.slug}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => openRecipe(recipe.slug)}
                  className={`w-full rounded-[18px] p-2 text-left ${isSelected ? "border-[3px] border-ink bg-white" : "border-[3px] border-transparent"}`}
                >
                  <div className="overflow-hidden rounded-[16px] bg-blush-deep">
                    <RecipePhoto
                      slug={recipe.slug}
                      photoUrl={recipe.photo_url}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                  <span className="mt-2 block font-display text-lg font-bold leading-snug">{recipe.title}</span>
                  <span className="mt-2 block">
                    <SafetyBadge verdict={badgeVerdict(checked.overall)} label={checked.overall} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        )}
      </div>

      {selected ? (
        <aside
          className="h-full min-h-0 w-full shrink-0 overflow-y-auto overscroll-contain border-l border-rose bg-white md:w-[min(42rem,56vw)]"
          aria-label={selected.title}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rose bg-blush px-4 py-3">
            <button
              ref={closeRef}
              type="button"
              onClick={closeRecipe}
              className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold"
            >
              Close
            </button>
            <p className="font-display text-base font-bold">Recipe</p>
          </div>
          <RecipePoster recipe={selected} foods={foods} layout="panel" />
        </aside>
      ) : null}
    </main>
  );
}
