import type { Meal, Recipe, Step } from "@/data/types";
import type { NutrientId } from "@/data/nutrient-targets";
import { NUTRIENT_TARGETS } from "@/data/nutrient-targets";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type OwnNutrition = Partial<Record<NutrientId, number>>;

type OwnRow = {
  id: string;
  title: string;
  source_url: string | null;
  ingredients: unknown;
  steps: unknown;
  servings: number | null;
  total_min: number | null;
  meals: string[] | null;
  nutrition: OwnNutrition | null;
};

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

function isMeal(value: string): value is Meal {
  return MEALS.includes(value as Meal);
}

export function recipeFromRow(row: OwnRow): { recipe: Recipe; nutrition: OwnNutrition | null } {
  const meals = (row.meals ?? []).filter(isMeal);
  const chosen = meals.length > 0 ? meals : (["dinner"] as Meal[]);
  const nutrition = row.nutrition && typeof row.nutrition === "object" ? row.nutrition : null;
  const highlights = NUTRIENT_TARGETS.flatMap((nutrient) => {
    const amount = nutrition?.[nutrient.id];
    return typeof amount === "number" ? [`${nutrient.name}: ${amount} ${nutrient.unit} per serving`] : [];
  });
  return {
    nutrition,
    recipe: {
      slug: `mine-${row.id}`,
      title: row.title,
      description: null,
      meal: chosen[0],
      meals: chosen,
      servings: row.servings && row.servings > 0 ? row.servings : 1,
      servings_label: null,
      prep_min: row.total_min ?? 0,
      cook_min: 0,
      total_min: row.total_min ?? 0,
      inactive_time_note: null,
      total_cost: 0,
      cost_is_approximate: true,
      cost_store: null,
      cost_checked_date: null,
      effort_tags: [],
      diet_tags: [],
      wic_friendly: null,
      stage: "both",
      chef_tips: [],
      superfood_spotlight: null,
      nutrition_highlights: highlights,
      benefits: [],
      evidence_links: [],
      photo_url: null,
      reviewed_by: null,
      reviewed_date: null,
      safety_note: null,
      source_document: row.source_url || "Added by you",
      ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
      steps: Array.isArray(row.steps) ? row.steps : [],
    },
  };
}

export async function saveOwnRecipe(input: {
  title: string;
  sourceUrl: string | null;
  ingredients: Recipe["ingredients"];
  steps: Step[];
  servings: number;
  totalMin: number;
  meals: Meal[];
  nutrition: OwnNutrition | null;
}) {
  const supabase = createBrowserSupabase();
  if (!supabase) throw new Error("Recipes are not connected yet. Start the local database, then try again.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Log in again to add a recipe.");
  const { data, error } = await supabase
    .from("user_recipes")
    .insert({
      user_id: userData.user.id,
      title: input.title.trim().slice(0, 120),
      source_label: input.sourceUrl ? "From a link" : "Added by you",
      source_url: input.sourceUrl,
      ingredients: input.ingredients,
      steps: input.steps,
      servings: input.servings,
      total_min: input.totalMin,
      meals: input.meals,
      nutrition: input.nutrition,
    })
    .select("id, title, source_url, ingredients, steps, servings, total_min, meals, nutrition")
    .single();
  if (error || !data) throw new Error(error?.message ?? "The recipe was not saved.");
  return recipeFromRow(data as OwnRow);
}
