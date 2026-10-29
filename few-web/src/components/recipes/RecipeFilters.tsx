"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatMeal } from "@/lib/format";
import {
  COST_OPTIONS,
  TIME_OPTIONS,
  activeFilterCount,
  emptyRecipeQuery,
  type Nutrient,
  type RecipeQuery,
  type RecipeSort,
  type StageFilter,
} from "@/lib/recipes/query";
import type { DietTag, EffortTag, Meal } from "@/data/types";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const EFFORTS: { value: EffortTag; label: string }[] = [
  { value: "no-cook", label: "No-cook" },
  { value: "one-pot", label: "One-pot" },
  { value: "sheet-pan", label: "Sheet-pan" },
  { value: "make-ahead", label: "Make-ahead" },
];
const DIETS: { value: DietTag; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "gluten-free option", label: "Gluten-free option" },
];
const NUTRIENTS: { value: Nutrient; label: string }[] = [
  { value: "folate", label: "Folate" },
  { value: "iron", label: "Iron" },
  { value: "calcium", label: "Calcium" },
  { value: "choline", label: "Choline" },
  { value: "omega-3", label: "Omega-3" },
  { value: "fiber", label: "Fiber" },
];
const STAGES: { value: StageFilter; label: string }[] = [
  { value: "pregnancy", label: "Pregnancy" },
  { value: "breastfeeding", label: "Breastfeeding" },
];

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Chip({
  checked,
  name,
  type,
  label,
  onChange,
}: {
  checked: boolean;
  name: string;
  type: "checkbox" | "radio";
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-rose bg-white px-4 has-[:checked]:border-ink has-[:checked]:bg-blush-deep">
      <input className="h-5 w-5 accent-ink" type={type} name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

export function RecipeFilters({
  query,
  onChange,
  baseline = emptyRecipeQuery,
}: {
  query: RecipeQuery;
  onChange: (query: RecipeQuery) => void;
  baseline?: RecipeQuery;
}) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(query);

  function clearFilters() {
    onChange(baseline);
    setOpen(false);
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor="recipe-search" className="text-base font-semibold">
          Search by name or ingredient
        </label>
        <input
          id="recipe-search"
          type="search"
          value={query.search}
          onChange={(event) => onChange({ ...query, search: event.target.value })}
          className="min-h-11 w-full rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full min-w-44 flex-col gap-2 md:w-48">
          <label htmlFor="recipe-sort" className="text-base font-semibold">
            Sort
          </label>
          <select
            id="recipe-sort"
            value={query.sort}
            onChange={(event) => onChange({ ...query, sort: event.target.value as RecipeSort })}
            className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
          >
            <option value="listed">As listed</option>
            <option value="quickest">Quickest</option>
            <option value="cheapest">Cheapest</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        <Button variant="secondary" aria-expanded={open} aria-controls="recipe-filters" onClick={() => setOpen((value) => !value)}>
          {count > 0 ? `Filters, ${count} on` : "Filters"}
        </Button>
        {count > 0 || query.search.trim() || query.sort !== "listed" ? (
          <Button variant="quiet" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>
      </div>
      {query.sort === "newest" ? (
        <p className="text-base">Newest uses the recipe list order, last recipe first. The source documents do not include dates.</p>
      ) : null}

      {open ? (
        <form
          id="recipe-filters"
          className="mt-4 flex flex-col gap-6 rounded-[20px] bg-white p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white pb-2">
            <h2 className="font-display text-2xl font-bold">Filters</h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-rose text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <fieldset>
            <legend className="font-display text-xl font-bold">Total time</legend>
            <p className="mt-1 text-base">Uses the listed total. Chill or rest time is separate.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip type="radio" name="time" label="Any" checked={query.maxMinutes === null} onChange={() => onChange({ ...query, maxMinutes: null })} />
              {TIME_OPTIONS.map((minutes) => (
                <Chip
                  key={minutes}
                  type="radio"
                  name="time"
                  label={`≤ ${minutes} min`}
                  checked={query.maxMinutes === minutes}
                  onChange={() => onChange({ ...query, maxMinutes: minutes })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Cost per serving</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip type="radio" name="cost" label="Any" checked={query.maxCost === null} onChange={() => onChange({ ...query, maxCost: null })} />
              {COST_OPTIONS.map((cost) => (
                <Chip
                  key={cost}
                  type="radio"
                  name="cost"
                  label={cost === 1.5 ? "≤ $1.50" : `≤ $${cost}`}
                  checked={query.maxCost === cost}
                  onChange={() => onChange({ ...query, maxCost: cost })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Meal</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEALS.map((meal) => (
                <Chip
                  key={meal}
                  type="checkbox"
                  name="meal"
                  label={formatMeal(meal)}
                  checked={query.meals.includes(meal)}
                  onChange={() => onChange({ ...query, meals: toggle(query.meals, meal) })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Effort</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {EFFORTS.map((effort) => (
                <Chip
                  key={effort.value}
                  type="checkbox"
                  name="effort"
                  label={effort.label}
                  checked={query.efforts.includes(effort.value)}
                  onChange={() => onChange({ ...query, efforts: toggle(query.efforts, effort.value) })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Diet</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {DIETS.map((diet) => (
                <Chip
                  key={diet.value}
                  type="checkbox"
                  name="diet"
                  label={diet.label}
                  checked={query.diets.includes(diet.value)}
                  onChange={() => onChange({ ...query, diets: toggle(query.diets, diet.value) })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Key nutrient</legend>
            <p className="mt-1 text-base">Matched from each recipe’s nutrition highlights.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NUTRIENTS.map((nutrient) => (
                <Chip
                  key={nutrient.value}
                  type="checkbox"
                  name="nutrient"
                  label={nutrient.label}
                  checked={query.nutrients.includes(nutrient.value)}
                  onChange={() => onChange({ ...query, nutrients: toggle(query.nutrients, nutrient.value) })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl font-bold">Stage</legend>
            <p className="mt-1 text-base">Recipes marked for both stages match either choice.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STAGES.map((stage) => (
                <Chip
                  key={stage.value}
                  type="checkbox"
                  name="stage"
                  label={stage.label}
                  checked={query.stages.includes(stage.value)}
                  onChange={() => onChange({ ...query, stages: toggle(query.stages, stage.value) })}
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="with-ingredient" className="font-display text-xl font-bold">
                With this ingredient
              </label>
              <input
                id="with-ingredient"
                value={query.includeIngredient}
                placeholder="lentils"
                autoComplete="off"
                onChange={(event) => onChange({ ...query, includeIngredient: event.target.value })}
                className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="without-ingredient" className="font-display text-xl font-bold">
                Without this ingredient
              </label>
              <input
                id="without-ingredient"
                value={query.excludeIngredient}
                placeholder="peanuts"
                autoComplete="off"
                onChange={(event) => onChange({ ...query, excludeIngredient: event.target.value })}
                className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
              />
            </div>
          </div>

          <fieldset>
            <legend className="font-display text-xl font-bold">Cook with what I have</legend>
            <p className="mt-1 text-base">Up to 3 ingredients. A recipe must use every one you type.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {query.have.map((value, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <label htmlFor={`have-${index}`} className="text-base font-semibold">
                    Ingredient {index + 1}
                  </label>
                  <input
                    id={`have-${index}`}
                    value={value}
                    autoComplete="off"
                    onChange={(event) => {
                      const have = [...query.have] as [string, string, string];
                      have[index] = event.target.value;
                      onChange({ ...query, have });
                    }}
                    className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setOpen(false)}>
              Apply
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
