import { Badge } from "@/components/ui/Badge";
import { Decoration } from "@/components/ui/Decoration";
import { SafetyBadge } from "@/components/ui/SafetyBadge";
import type { Food, Recipe } from "@/data/types";
import { costPerServing, formatMeal, formatMinutes, formatMoney } from "@/lib/format";
import { badgeVerdict, checkRecipe } from "@/lib/safety/check";

export function RecipeCard({ recipe, foods }: { recipe: Recipe; foods: Food[] }) {
  const perServing = costPerServing(recipe.total_cost, recipe.servings);
  const checked = checkRecipe(recipe, foods);
  const verdict = badgeVerdict(checked.overall);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-ink/10 bg-white">
      <div className="relative flex h-36 items-end bg-saffron-soft p-4 pr-16">
        <Decoration kind="leaf" className="absolute top-3 right-3 h-10 w-10 text-leaf" />
        <p className="text-base text-ink">Photo not in the source documents</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {recipe.meals.map((meal) => (
            <Badge key={meal} kind="meal">
              {formatMeal(meal)}
            </Badge>
          ))}
        </div>
        <h3 className="font-display text-xl font-bold leading-snug text-ink">{recipe.title}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge kind="time">{formatMinutes(recipe.total_min)} total</Badge>
          <Badge kind="cost">
            {formatMoney(perServing, recipe.cost_is_approximate)} per serving
          </Badge>
        </div>
        <SafetyBadge verdict={verdict} label={checked.overall} />
        {recipe.safety_note ? <p className="text-base text-ink">{recipe.safety_note}</p> : null}
        <div className="mt-auto flex flex-wrap gap-2">
          {recipe.effort_tags.map((tag) => (
            <Badge key={tag} kind="effort">
              {tag}
            </Badge>
          ))}
          {recipe.diet_tags.map((tag) => (
            <Badge key={tag} kind="diet">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
