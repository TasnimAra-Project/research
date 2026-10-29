import { RecipeListActions } from "@/components/recipes/RecipeListActions";
import { RecipePhoto } from "@/components/recipes/RecipePhoto";
import { NutrientChip } from "@/components/ui/NutrientChip";
import { SafetyBadge, SafetyNote } from "@/components/ui/SafetyBadge";
import type { Food, Recipe } from "@/data/types";
import { costPerServing, formatCook, formatMeal, formatMinutes, formatMoney, formatStage, formatTimer } from "@/lib/format";
import { badgeVerdict, checkRecipe } from "@/lib/safety/check";
import { foodBySlug } from "@/lib/safety";

function Stat({ label, value, icon }: { label: string; value: string; icon: "prep" | "cook" | "total" | "cost" }) {
  return (
    <div className="flex min-h-11 flex-col items-center gap-1 text-center text-ink">
      <StatIcon kind={icon} />
      <span className="text-base font-semibold">{value}</span>
      <span className="text-base">{label}</span>
    </div>
  );
}

function StatIcon({ kind }: { kind: "prep" | "cook" | "total" | "cost" }) {
  const common = { viewBox: "0 0 32 32", className: "h-8 w-8", fill: "none", "aria-hidden": true as const };
  if (kind === "prep") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 10 v7 l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "cook") {
    return (
      <svg {...common}>
        <path d="M8 14 h16 v8 a4 4 0 0 1-4 4 h-8 a4 4 0 0 1-4-4 z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 14 V10 a4 4 0 0 1 8 0 v4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "total") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 8 v8 M12 16 h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 10 v12 M13 13 h4.5 a2 2 0 0 1 0 4 H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function RecipePoster({
  recipe,
  foods,
  layout = "poster",
}: {
  recipe: Recipe;
  foods: Food[];
  layout?: "poster" | "panel";
}) {
  const panel = layout === "panel";
  const perServing = costPerServing(recipe.total_cost, recipe.servings);
  const checked = checkRecipe(recipe, foods);
  const verdict = badgeVerdict(checked.overall);
  const servings = recipe.servings_label ?? `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`;

  return (
    <article className={panel ? "bg-white text-ink" : "overflow-hidden rounded-[20px] border border-ink/10 bg-white text-ink"}>
      <div className={panel ? "flex flex-col gap-4 p-4" : "grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr] md:p-6"}>
        <RecipePhoto
          slug={recipe.slug}
          photoUrl={recipe.photo_url}
          className="h-auto w-full rounded-[18px] object-contain"
        />
        <div>
          <p className="font-display text-base font-bold tracking-wide text-ink uppercase">{formatMeal(recipe.meal)}</p>
          {panel ? (
            <h2 className="mt-1 font-display text-3xl font-bold leading-tight">{recipe.title}</h2>
          ) : (
            <h3 className="mt-1 font-display text-3xl font-bold leading-tight">{recipe.title}</h3>
          )}
          <p className="mt-2 text-base">
            {servings} · {formatStage(recipe.stage)}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label="Prep" value={formatMinutes(recipe.prep_min)} icon="prep" />
            <Stat label="Cook" value={formatCook(recipe.cook_min)} icon="cook" />
            <Stat label="Total" value={formatMinutes(recipe.total_min)} icon="total" />
            <Stat
              label="Cost"
              value={formatMoney(perServing, recipe.cost_is_approximate)}
              icon="cost"
            />
          </div>
          <p className="mt-1 text-center text-base">Cost is per serving. Recipe total {formatMoney(recipe.total_cost, recipe.cost_is_approximate)}.</p>
          {recipe.inactive_time_note ? <p className="mt-2 text-base">{recipe.inactive_time_note}</p> : null}
          <div className="mt-4">
            <SafetyBadge verdict={verdict} label={checked.overall} />
            {recipe.safety_note ? <p className="mt-2 text-base">{recipe.safety_note}</p> : null}
          </div>
        </div>
      </div>

      <div className={panel ? "mx-4 mb-4 rounded-[18px] bg-blush-deep p-4" : "mx-4 mb-4 rounded-[18px] bg-blush-deep p-4 md:mx-6"}>
        <h4 className="font-display text-xl font-bold">What&apos;s good</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {recipe.nutrition_highlights.map((item) => (
            <NutrientChip key={item}>{item}</NutrientChip>
          ))}
        </div>
        {recipe.description ? <p className="mt-3 text-base">{recipe.description}</p> : null}
        {recipe.superfood_spotlight ? <p className="mt-3 text-base">{recipe.superfood_spotlight}</p> : null}
      </div>

      <section className={panel ? "mx-4 mb-4 rounded-[20px] border-2 border-berry bg-berry-soft p-4" : "mx-4 mb-4 rounded-[20px] border-2 border-berry bg-berry-soft p-4 md:mx-6"}>
        <h4 className="font-display text-2xl font-bold">Ingredients</h4>
        <ul className="mt-3 flex flex-col gap-3">
          {recipe.ingredients.map((ingredient) => {
            const food = foodBySlug(foods, ingredient.food_slug);
            const showBadge = food && food.verdict !== "unknown";
            return (
              <li key={ingredient.display} className="rounded-2xl bg-white px-3 py-3 text-base">
                <p>{ingredient.display}</p>
                {showBadge ? (
                  <div className="mt-2">
                    <SafetyNote
                      verdict={food.verdict}
                      change={food.safe_version}
                      reason={food.reason}
                      sourceName={food.source_name}
                      sourceUrl={food.source_url}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <RecipeListActions recipe={recipe} foods={foods} />
      </section>

      <div className={panel ? "grid gap-6 px-4 pb-4" : "grid gap-6 px-4 pb-4 md:grid-cols-2 md:px-6"}>
        <section>
          <h4 className="font-display text-xl font-bold">Directions</h4>
          <ol className="mt-3 flex flex-col gap-3">
            {recipe.steps.map((step, index) => (
              <li key={step.text} className="flex gap-3 text-base">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush-deep font-bold">
                  {index + 1}
                </span>
                <span className="pt-2">
                  {step.text}
                  {step.timer_seconds ? <span className="mt-1 block">Timer available: {formatTimer(step.timer_seconds)}.</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className={panel ? "grid gap-4 px-4 pb-4" : "grid gap-4 px-4 pb-4 md:grid-cols-2 md:px-6"}>
        <section className="rounded-[18px] bg-blush-deep p-4">
          <h4 className="font-display text-xl font-bold">Chef&apos;s Tips</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
            {recipe.chef_tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-4">
          <section className="rounded-[18px] border-2 border-leaf bg-leaf-soft p-4">
            <h4 className="font-display text-xl font-bold">Nutrition Highlights</h4>
            <ul className="mt-3 space-y-2 text-base">
              {recipe.nutrition_highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 text-leaf">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[18px] border-2 border-berry bg-berry-soft p-4">
            <h4 className="font-display text-xl font-bold">Pregnancy &amp; Breastfeeding Benefits</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
              {recipe.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {recipe.evidence_links.length > 0 ? (
        <section className="px-4 pb-4 md:px-6">
          <h4 className="font-display text-xl font-bold">Evidence</h4>
          <ul className="mt-3 space-y-2 text-base">
            {recipe.evidence_links.map((link) => (
              <li key={link.url + link.label}>
                <a className="underline decoration-2 underline-offset-4" href={link.url}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </article>
  );
}
