"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Food, Recipe } from "@/data/types";
import { pantryHit, todayISO, type PantryItem } from "@/lib/grocery/lines";
import { addRecipesToList, loadList } from "@/lib/grocery/store";
import { foodBySlug } from "@/lib/safety";

export function RecipeListActions({ recipe, foods }: { recipe: Recipe; foods: Food[] }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [picked, setPicked] = useState<boolean[]>(() => recipe.ingredients.map(() => true));

  useEffect(() => {
    let active = true;
    loadList()
      .then(({ pantry: items }) => {
        if (!active) return;
        const today = todayISO();
        setPantry(items);
        setPicked(
          recipe.ingredients.map((ingredient) => {
            const food = foodBySlug(foods, ingredient.food_slug);
            return !pantryHit(items, food, food?.name ?? ingredient.item, today);
          }),
        );
      })
      .catch(() => {
        if (active) setPicked(recipe.ingredients.map(() => true));
      });
    return () => {
      active = false;
    };
  }, [foods, recipe]);

  const today = todayISO();
  const selectedCount = picked.filter(Boolean).length;

  async function addSelected() {
    const ingredients = recipe.ingredients.filter((_, index) => picked[index]);
    if (ingredients.length === 0) return;
    setPending(true);
    setStatus(null);
    try {
      const result = await addRecipesToList([{ ...recipe, ingredients }], foods, { skipPantry: false });
      setStatus(
        result.added === 0
          ? "Nothing new was added."
          : `Added ${result.added === 1 ? "1 ingredient" : `${result.added} ingredients`} to your grocery list.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The ingredients could not be added.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-semibold">Choose ingredients to add</legend>
        {recipe.ingredients.map((ingredient, index) => {
          const food = foodBySlug(foods, ingredient.food_slug);
          const held = pantryHit(pantry, food, food?.name ?? ingredient.item, today);
          return (
            <label key={`${ingredient.display}-${index}`} className="flex min-h-11 items-center gap-3 text-base">
              <input
                className="h-5 w-5 accent-ink"
                type="checkbox"
                checked={picked[index] ?? false}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPicked((current) => current.map((value, itemIndex) => (itemIndex === index ? checked : value)));
                }}
              />
              <span>
                {ingredient.display}
                {held ? ", in your pantry" : ""}
              </span>
            </label>
          );
        })}
      </fieldset>
      <Button type="button" onClick={addSelected} disabled={pending || selectedCount === 0}>
        {selectedCount === 0 ? "Add selected ingredients" : `Add ${selectedCount} selected`}
      </Button>
      {status ? (
        <p role="status" className="text-base">
          {status}
        </p>
      ) : null}
    </div>
  );
}
