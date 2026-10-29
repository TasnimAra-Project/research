"use client";

import { useEffect, useMemo, useState } from "react";
import { AddRecipe } from "@/components/plan/AddRecipe";
import { NutrientTable } from "@/components/plan/NutrientTable";
import { Button } from "@/components/ui/Button";
import type { Food, Recipe } from "@/data/types";
import { NUTRIENT_TARGETS, type NutrientId } from "@/data/nutrient-targets";
import { formatMoney } from "@/lib/format";
import type { Profile } from "@/lib/profile/types";
import { addRecipesToList } from "@/lib/grocery/store";
import { DAYS, PLAN_MEALS, slotKey, weekTotals, type PlanMeal, type PlanSlot } from "@/lib/plan/fill";
import { deleteTemplate, savePlan, saveTemplate, type PlanTemplate } from "@/lib/plan/store";
import type { OwnNutrition } from "@/lib/recipes/own";
import { nutritionForSlugs } from "@/app/plan/nutrition";

function emptyFrom(saved: PlanSlot[]) {
  return DAYS.flatMap((_, day) =>
    PLAN_MEALS.map((meal) => ({
      day,
      meal,
      recipeSlug: saved.find((slot) => slot.day === day && slot.meal === meal)?.recipeSlug ?? null,
    })),
  );
}

export function MealPlanner({
  recipes,
  foods,
  profile,
  initialSlots,
  initialTemplates,
  initialNutrition,
  templateToApply,
}: {
  recipes: Recipe[];
  foods: Food[];
  profile: Profile | null;
  initialSlots: PlanSlot[];
  initialTemplates: PlanTemplate[];
  initialNutrition: Record<string, OwnNutrition>;
  templateToApply: string | null;
}) {
  const [library, setLibrary] = useState(recipes);
  const [ownNutrition, setOwnNutrition] = useState(initialNutrition);
  const [slots, setSlots] = useState(initialSlots);
  const [templates, setTemplates] = useState(initialTemplates);
  const [chosenTemplate, setChosenTemplate] = useState(templateToApply ?? "");
  const [templateName, setTemplateName] = useState("");
  const [selected, setSelected] = useState<{ day: number; meal: PlanMeal } | null>(null);
  const [panel, setPanel] = useState<"choose" | "write" | "link">("choose");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [nutrients, setNutrients] = useState<Record<NutrientId, number> | null>(null);
  const [calculated, setCalculated] = useState(false);
  const bySlug = useMemo(() => new Map(library.map((recipe) => [recipe.slug, recipe])), [library]);
  const totals = weekTotals(slots, library);
  const planKey = slots.map((slot) => slot.recipeSlug ?? "").join("|");

  async function persist(next: PlanSlot[], message: string) {
    setSlots(next);
    setStatus(message);
    try {
      await savePlan(next);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The week was not saved.");
    }
  }

  useEffect(() => {
    if (!templateToApply) return;
    const template = initialTemplates.find((item) => item.id === templateToApply);
    if (!template) return;
    const timer = setTimeout(() => {
      void persist(emptyFrom(template.slots), `Using ${template.name}.`);
    }, 0);
    return () => clearTimeout(timer);
    // Apply a template opened from Settings once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateToApply]);

  useEffect(() => {
    const filled = planKey.replace(/\|/g, "");
    if (!filled) {
      const timer = setTimeout(() => {
        setNutrients(null);
        setCalculated(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    let active = true;
    const timer = setTimeout(() => {
      void nutritionForSlugs(slots.map((slot) => slot.recipeSlug ?? "")).then((result) => {
        if (!active) return;
        const next = { ...result.totals };
        let own = false;
        for (const slot of slots) {
          const extra = slot.recipeSlug ? ownNutrition[slot.recipeSlug] : undefined;
          if (!extra) continue;
          own = true;
          for (const nutrient of NUTRIENT_TARGETS) {
            const amount = extra[nutrient.id];
            if (typeof amount === "number") next[nutrient.id] += amount;
          }
        }
        for (const nutrient of NUTRIENT_TARGETS) next[nutrient.id] = Math.round(next[nutrient.id] * 10) / 10;
        setNutrients(next);
        setCalculated(result.calculated || own);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ownNutrition, planKey, slots]);

  function assign(slug: string | null) {
    if (!selected) return;
    void persist(
      slots.map((slot) => (slot.day === selected.day && slot.meal === selected.meal ? { ...slot, recipeSlug: slug } : slot)),
      slug ? "Saved." : "Cleared.",
    );
  }

  const selectedRecipes = selected
    ? library.filter((recipe) => {
        const matchesMeal = recipe.meals.includes(selected.meal);
        const matchesQuery = recipe.title.toLowerCase().includes(query.trim().toLowerCase());
        return matchesMeal && matchesQuery;
      })
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex min-w-[16rem] flex-col gap-2 text-base font-semibold" htmlFor="saved-week">
          Saved weeks
          <select
            id="saved-week"
            value={chosenTemplate}
            onChange={(event) => {
              const id = event.target.value;
              setChosenTemplate(id);
              const template = templates.find((item) => item.id === id);
              if (template) void persist(emptyFrom(template.slots), `Using ${template.name}.`);
            }}
            className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 font-normal"
          >
            <option value="">Choose a saved week</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const name = templateName.trim();
            if (!name) return;
            void saveTemplate(name, slots)
              .then((saved) => {
                setTemplates([saved, ...templates]);
                setChosenTemplate(saved.id);
                setTemplateName("");
                setStatus(`Saved ${saved.name}.`);
              })
              .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "The template was not saved."));
          }}
        >
          <label className="flex flex-col gap-2 text-base font-semibold" htmlFor="template-name">
            Save this week
            <input
              id="template-name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 font-normal"
            />
          </label>
          <Button type="submit">Save</Button>
          {chosenTemplate ? (
            <Button
              variant="quiet"
              onClick={() => {
                const id = chosenTemplate;
                void deleteTemplate(id)
                  .then(() => {
                    setTemplates(templates.filter((item) => item.id !== id));
                    setChosenTemplate("");
                    setStatus("Deleted that saved week.");
                  })
                  .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "The template was not deleted."));
              }}
            >
              Delete
            </Button>
          ) : null}
        </form>
      </div>
      {status ? (
        <p role="status" className="mt-3 text-base">
          {status}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <Button
          onClick={() => {
            const chosen = slots.map((slot) => bySlug.get(slot.recipeSlug ?? "")).filter((recipe): recipe is Recipe => Boolean(recipe));
            void addRecipesToList(chosen, foods)
              .then(() => setStatus("Added this week to the grocery list."))
              .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "The grocery list was not updated."));
          }}
        >
          Add ingredients to the grocery list
        </Button>
        <div className="flex flex-wrap gap-3">
          <p className="rounded-2xl border-2 border-ink bg-white px-5 py-3 font-display text-3xl font-bold">{formatMoney(totals.cost, totals.approximate)}</p>
          <p className="rounded-2xl border-2 border-ink bg-blush-deep px-5 py-3 font-display text-3xl font-bold">{totals.minutes} min</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[24px] border-2 border-rose bg-white">
        <table className="w-full min-w-[104rem] table-fixed border-collapse text-left">
          <caption className="sr-only">Week planner</caption>
          <thead>
            <tr className="bg-blush-deep">
              <th className="sticky left-0 w-36 bg-blush-deep px-4 py-4" scope="col">
                <span className="sr-only">Meal</span>
              </th>
              {DAYS.map((day) => (
                <th key={day} className="w-52 border-l border-rose px-4 py-4 text-center font-display text-xl font-bold" scope="col">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_MEALS.map((meal) => (
              <tr key={meal} className="border-t-2 border-rose">
                <th className="sticky left-0 w-36 bg-blush px-4 py-4 text-base font-semibold capitalize" scope="row">
                  {meal}
                </th>
                {DAYS.map((day, index) => {
                  const slot = slots.find((item) => item.day === index && item.meal === meal) ?? { day: index, meal, recipeSlug: null };
                  const title = slot.recipeSlug ? (bySlug.get(slot.recipeSlug)?.title ?? "Recipe") : null;
                  const open = selected?.day === index && selected.meal === meal;
                  return (
                    <td key={slotKey(index, meal)} className="w-52 border-l border-rose p-3 align-top">
                      <button
                        type="button"
                        aria-pressed={open}
                        aria-label={`${day} ${meal}, ${title ?? "choose a recipe"}`}
                        onClick={() => {
                          setSelected(open ? null : { day: index, meal });
                          setPanel("choose");
                          setQuery("");
                        }}
                        className={`block min-h-32 w-full whitespace-normal break-words rounded-2xl border-2 px-3 py-3 text-left text-base leading-snug ${
                          open ? "border-ink bg-blush-deep" : title ? "border-rose bg-white" : "border-dashed border-rose bg-blush"
                        }`}
                      >
                        {title ?? "Choose"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && panel === "choose" ? (
        <section className="mt-4 rounded-[20px] border-2 border-rose bg-white p-4" aria-label={`${DAYS[selected.day]} ${selected.meal}`}>
          <h2 className="font-display text-2xl font-bold capitalize">
            {DAYS[selected.day]} {selected.meal}
          </h2>
          <label className="mt-3 flex flex-col gap-2 text-base font-semibold" htmlFor="recipe-search">
            Search recipes
            <input
              id="recipe-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose px-4 font-normal"
            />
          </label>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {selectedRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <button type="button" className="min-h-11 w-full rounded-2xl px-3 text-left text-base hover:bg-blush" onClick={() => assign(recipe.slug)}>
                  {recipe.title}
                </button>
              </li>
            ))}
            {selectedRecipes.length === 0 ? <li className="text-base">No recipes match.</li> : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => assign(null)}>
              Clear this meal
            </Button>
            <Button variant="secondary" onClick={() => setPanel("write")}>
              Add a recipe
            </Button>
            <Button variant="secondary" onClick={() => setPanel("link")}>
              Add from a link
            </Button>
          </div>
        </section>
      ) : null}
      {selected && panel !== "choose" ? (
        <div className="mt-4">
          <AddRecipe
            foods={foods}
            dayLabel={DAYS[selected.day]}
            meal={selected.meal}
            mode={panel}
            onCancel={() => setPanel("choose")}
            onReady={(recipe, nutrition) => {
              setLibrary((current) => [recipe, ...current.filter((item) => item.slug !== recipe.slug)]);
              if (nutrition) setOwnNutrition((current) => ({ ...current, [recipe.slug]: nutrition }));
              setPanel("choose");
              void persist(
                slots.map((slot) => (slot.day === selected.day && slot.meal === selected.meal ? { ...slot, recipeSlug: recipe.slug } : slot)),
                `Added ${recipe.title}.`,
              );
            }}
          />
        </div>
      ) : null}
      <NutrientTable lifeStage={profile?.lifeStage ?? null} totals={nutrients} calculated={calculated} />
    </div>
  );
}
