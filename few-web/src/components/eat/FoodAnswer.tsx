import Link from "next/link";
import { Decoration } from "@/components/ui/Decoration";
import { SafetyBadge, SafetyNote } from "@/components/ui/SafetyBadge";
import { UnverifiedNote } from "@/components/eat/UnverifiedNote";
import type { Food, Recipe } from "@/data/types";
import { checkRecipe } from "@/lib/safety/check";
import { guidesForName } from "@/lib/safety/guides";

export function FoodAnswer({ food, foods, recipes }: { food: Food; foods: Food[]; recipes: Recipe[] }) {
  const safeRecipes = recipes.filter((recipe) => {
    const used = recipe.ingredients.some((ingredient) => ingredient.food_slug === food.slug || ingredient.alternate_food_slug === food.slug);
    if (!used || food.verdict === "avoid") return false;
    const line = checkRecipe(recipe, foods).ingredients.find((item) => item.foodSlug === food.slug);
    return line?.label === "Okay";
  });

  return (
    <article className="rounded-[20px] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        {food.verdict === "okay" ? <Decoration kind="butterfly" flutter className="h-12 w-16 text-berry" /> : null}
        <h1 className="font-display text-4xl font-bold">{food.name}</h1>
      </div>
      <div className="mt-4">
        {food.verdict === "unknown" ? (
          <UnverifiedNote guides={guidesForName(food.name)} />
        ) : food.verdict === "okay" ? (
          <>
            <SafetyBadge verdict="okay" />
            {food.reason ? <p className="mt-3 text-base">{food.reason}</p> : null}
            {food.source_url ? (
              <p className="mt-3 text-base">
                <a className="underline" href={food.source_url}>
                  {food.source_name ?? "Source"}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <SafetyNote
            verdict={food.verdict}
            change={food.safe_version}
            reason={food.reason}
            sourceName={food.source_name}
            sourceUrl={food.source_url}
          />
        )}
      </div>
      {safeRecipes.length > 0 ? (
        <>
          <h2 className="mt-6 font-display text-2xl font-bold">Recipes</h2>
          <ul className="mt-2 space-y-2 text-base">
            {safeRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <Link className="underline" href={`/recipes?recipe=${recipe.slug}`}>
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}
