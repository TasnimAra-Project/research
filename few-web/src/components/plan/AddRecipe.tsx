"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Food, Meal, Recipe, Step } from "@/data/types";
import { NUTRIENT_TARGETS, type NutrientId } from "@/data/nutrient-targets";
import { measureRecipe, previewRecipeLink, type PageDraft } from "@/app/plan/incoming";
import { ingredientFromLine } from "@/lib/recipes/lines";
import { saveOwnRecipe, type OwnNutrition } from "@/lib/recipes/own";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AddRecipe({
  foods,
  dayLabel,
  meal,
  mode,
  onCancel,
  onReady,
}: {
  foods: Food[];
  dayLabel: string;
  meal: Meal;
  mode: "write" | "link";
  onCancel: () => void;
  onReady: (recipe: Recipe, nutrition: OwnNutrition | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("2");
  const [minutes, setMinutes] = useState("20");
  const [meals, setMeals] = useState<Meal[]>([meal]);
  const [ingredientText, setIngredientText] = useState("");
  const [stepText, setStepText] = useState("");
  const [link, setLink] = useState("");
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [pageNutrition, setPageNutrition] = useState<OwnNutrition>({});
  const [nutrition, setNutrition] = useState<OwnNutrition | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleMeal(next: Meal) {
    setMeals((current) => (current.includes(next) ? current.filter((item) => item !== next) : [...current, next]));
  }

  async function readWritten() {
    const ingredients = ingredientText
      .split("\n")
      .map((line) => ingredientFromLine(line, foods))
      .filter((item) => item !== null);
    if (!title.trim() || ingredients.length === 0) {
      setStatus("Add a name and at least one ingredient.");
      return;
    }
    setPending(true);
    setStatus("Reading the ingredients and checking USDA.");
    const count = Number(servings) > 0 ? Number(servings) : 1;
    const measured = await measureRecipe(ingredients, count);
    setNutrition(measured.calculated ? measured.totals : null);
    setPageNutrition({});
    setNote(measured.message);
    setDraft({
      title: title.trim(),
      sourceUrl: "",
      servings: count,
      totalMin: Number(minutes) > 0 ? Number(minutes) : 0,
      ingredients,
      steps: stepText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, timer_seconds: null })),
      pageNutrition: {},
    });
    setPending(false);
    setStatus(null);
  }

  async function readLink() {
    setPending(true);
    setStatus("Opening that page.");
    setDraft(null);
    const found = await previewRecipeLink(link);
    if ("error" in found) {
      setPending(false);
      setStatus(found.error);
      return;
    }
    setStatus("Checking nutrients.");
    const measured = await measureRecipe(found.ingredients, found.servings);
    const merged: OwnNutrition = measured.calculated ? { ...measured.totals } : {};
    for (const nutrient of NUTRIENT_TARGETS) {
      const listed = found.pageNutrition[nutrient.id];
      if (typeof listed === "number") merged[nutrient.id] = listed;
    }
    setPageNutrition(found.pageNutrition);
    setNutrition(Object.keys(merged).length > 0 ? merged : null);
    setNote(measured.message);
    setDraft(found);
    setTitle(found.title);
    setMeals([meal]);
    setPending(false);
    setStatus(null);
  }

  async function confirm() {
    if (!draft) return;
    const chosen = meals.length > 0 ? meals : [meal];
    setPending(true);
    setStatus("Saving this recipe.");
    try {
      const steps: Step[] = draft.steps;
      const saved = await saveOwnRecipe({
        title: draft.title,
        sourceUrl: draft.sourceUrl || null,
        ingredients: draft.ingredients,
        steps,
        servings: draft.servings,
        totalMin: draft.totalMin,
        meals: chosen,
        nutrition,
      });
      onReady(saved.recipe, saved.nutrition);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The recipe was not saved.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-[20px] border-2 border-rose bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-bold">{mode === "link" ? "Add from a link" : "Add a recipe"}</h3>
        <button type="button" className="text-base underline" onClick={onCancel}>
          Back
        </button>
      </div>
      {mode === "link" && !draft ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void readLink();
          }}
        >
          <div className="flex min-w-[16rem] flex-1 flex-col gap-2">
            <label htmlFor="recipe-link" className="text-base font-semibold">
              Recipe link
            </label>
            <input
              id="recipe-link"
              type="url"
              required
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
              className="min-h-11 rounded-2xl border-2 border-rose px-4 text-base"
            />
          </div>
          <Button type="submit" disabled={pending}>
            Look up
          </Button>
        </form>
      ) : null}
      {mode === "write" && !draft ? (
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void readWritten();
          }}
        >
          <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="own-title">
            Name
            <input
              id="own-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose px-4 font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="own-servings">
              Servings
              <input
                id="own-servings"
                inputMode="numeric"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
                className="min-h-11 w-24 rounded-2xl border-2 border-rose px-4 font-normal"
              />
            </label>
            <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="own-minutes">
              Minutes
              <input
                id="own-minutes"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="min-h-11 w-24 rounded-2xl border-2 border-rose px-4 font-normal"
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-base font-semibold">Meals</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={meals.includes(item)}
                  onClick={() => toggleMeal(item)}
                  className={`min-h-11 rounded-full border-2 px-4 text-base capitalize ${meals.includes(item) ? "border-ink bg-blush-deep" : "border-rose bg-white"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="own-ingredients">
            Ingredients, one on each line
            <textarea
              id="own-ingredients"
              value={ingredientText}
              onChange={(event) => setIngredientText(event.target.value)}
              rows={5}
              className="rounded-2xl border-2 border-rose px-4 py-3 font-normal"
            />
          </label>
          <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="own-steps">
            Steps, one on each line
            <textarea
              id="own-steps"
              value={stepText}
              onChange={(event) => setStepText(event.target.value)}
              rows={4}
              className="rounded-2xl border-2 border-rose px-4 py-3 font-normal"
            />
          </label>
          <Button type="submit" disabled={pending}>
            Read ingredients
          </Button>
        </form>
      ) : null}
      {draft ? (
        <div className="mt-4">
          <p className="text-base font-semibold">{draft.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
            {draft.ingredients.map((item) => (
              <li key={item.display}>{item.display}</li>
            ))}
          </ul>
          <p className="mt-3 text-base">Nutrients for one serving. A number from the page is kept. Anything missing is calculated from the ingredients.</p>
          <ul className="mt-2 text-base">
            {NUTRIENT_TARGETS.map((nutrient) => {
              const fromPage = typeof pageNutrition[nutrient.id] === "number";
              const amount = nutrition?.[nutrient.id];
              return (
                <li key={nutrient.id}>
                  {nutrient.name}: {typeof amount === "number" ? `${amount} ${nutrient.unit}` : "Not found"}
                  {fromPage ? " (from the page)" : ""}
                </li>
              );
            })}
          </ul>
          {note ? <p className="mt-2 text-base">{note}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={pending} onClick={() => void confirm()}>
              Add to {dayLabel} {meal}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setDraft(null);
                setNutrition(null);
              }}
            >
              Edit
            </Button>
          </div>
        </div>
      ) : null}
      {status ? (
        <p role="status" className="mt-3 text-base">
          {status}
        </p>
      ) : null}
    </div>
  );
}
