import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MealPlanner } from "@/components/plan/MealPlanner";
import { seedData } from "@/data";
import { loadProfile } from "@/lib/profile/load";
import { emptyWeek, type PlanSlot } from "@/lib/plan/fill";
import type { PlanTemplate } from "@/lib/plan/store";
import { recipeFromRow, type OwnNutrition } from "@/lib/recipes/own";
import { createServerSupabase } from "@/lib/supabase/server";

async function PlanGate({ templateId }: { templateId: string | null }) {
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  const profile = await loadProfile(data.user.id);
  const [slotResult, templateResult, ownResult] = await Promise.all([
    supabase.from("meal_slots").select("day, meal, recipe_slug").eq("user_id", data.user.id),
    supabase.from("plan_templates").select("id, name, slots").eq("user_id", data.user.id).order("created_at", { ascending: false }),
    supabase.from("user_recipes").select("id, title, source_url, ingredients, steps, servings, total_min, meals, nutrition").eq("user_id", data.user.id),
  ]);
  const templates: PlanTemplate[] = templateResult.error
    ? []
    : (templateResult.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        slots: (row.slots as PlanSlot[]) ?? [],
      }));
  const requested = templateId ? templates.find((item) => item.id === templateId) : undefined;
  const slots = requested
    ? DAYS_FROM(requested.slots)
    : emptyWeek();
  if (!requested && !slotResult.error) {
    for (const row of slotResult.data ?? []) {
      const slot = slots.find((item) => item.day === row.day && item.meal === row.meal);
      if (slot && typeof row.recipe_slug === "string") slot.recipeSlug = row.recipe_slug;
    }
  }
  const own = ownResult.error ? [] : (ownResult.data ?? []).map((row) => recipeFromRow(row));
  const nutrition: Record<string, OwnNutrition> = {};
  for (const item of own) {
    if (item.nutrition) nutrition[item.recipe.slug] = item.nutrition;
  }

  return (
    <main id="main" className="min-h-full px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Week</h1>
      <p className="mt-2 max-w-2xl text-base">Choose a day and a meal, then pick a recipe.</p>
      <div className="mt-6">
        <MealPlanner
          recipes={[...own.map((item) => item.recipe), ...seedData.recipes]}
          foods={seedData.foods}
          profile={profile}
          initialSlots={slots}
          initialTemplates={templates}
          initialNutrition={nutrition}
          templateToApply={requested?.id ?? null}
        />
      </div>
    </main>
  );
}

function DAYS_FROM(saved: PlanSlot[]) {
  const slots = emptyWeek();
  for (const savedSlot of saved) {
    const slot = slots.find((item) => item.day === savedSlot.day && item.meal === savedSlot.meal);
    if (slot) slot.recipeSlug = savedSlot.recipeSlug;
  }
  return slots;
}

export default function PlanPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <PlanLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function PlanLoader({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams;
  const templateId = typeof params.template === "string" ? params.template : null;
  return <PlanGate templateId={templateId} />;
}
