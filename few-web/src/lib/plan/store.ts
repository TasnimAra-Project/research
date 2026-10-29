import { createBrowserSupabase } from "@/lib/supabase/client";
import { emptyWeek, type PlanSlot } from "@/lib/plan/fill";

export type PlanTemplate = { id: string; name: string; slots: PlanSlot[] };

async function client() {
  const supabase = createBrowserSupabase();
  if (!supabase) throw new Error("The week is not connected yet. Start the local database, then try again.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Log in again to save your week.");
  return { supabase, userId: data.user.id };
}

export async function loadPlan() {
  const { supabase } = await client();
  const [slots, templates] = await Promise.all([
    supabase.from("meal_slots").select("day, meal, recipe_slug"),
    supabase.from("plan_templates").select("id, name, slots").order("created_at", { ascending: false }),
  ]);
  if (slots.error) throw new Error(slots.error.message);
  if (templates.error) throw new Error(templates.error.message);
  const week = emptyWeek();
  for (const row of slots.data ?? []) {
    const slot = week.find((item) => item.day === row.day && item.meal === row.meal);
    if (slot) slot.recipeSlug = row.recipe_slug;
  }
  return {
    slots: week,
    templates: (templates.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slots: row.slots as PlanSlot[],
    })),
  };
}

export async function savePlan(slots: PlanSlot[]) {
  const { supabase, userId } = await client();
  const cleared = await supabase.from("meal_slots").delete().eq("user_id", userId);
  if (cleared.error) throw new Error(cleared.error.message);
  const rows = slots
    .filter((slot) => slot.recipeSlug)
    .map((slot) => ({ user_id: userId, day: slot.day, meal: slot.meal, recipe_slug: slot.recipeSlug }));
  if (rows.length === 0) return;
  const inserted = await supabase.from("meal_slots").insert(rows);
  if (inserted.error) throw new Error(inserted.error.message);
}

export async function saveTemplate(name: string, slots: PlanSlot[]) {
  const { supabase, userId } = await client();
  const { data, error } = await supabase
    .from("plan_templates")
    .insert({ user_id: userId, name: name.trim().slice(0, 80), slots })
    .select("id, name, slots")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, name: data.name as string, slots: data.slots as PlanSlot[] };
}

export async function deleteTemplate(id: string) {
  const { supabase } = await client();
  const { error } = await supabase.from("plan_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
