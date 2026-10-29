import type { Food, Recipe } from "@/data/types";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  combineWithExisting,
  draftsForRecipes,
  mergeDrafts,
  normalizeName,
  pantryHit,
  todayISO,
  type GroceryItem,
  type PantryItem,
  type WeekRecipe,
} from "@/lib/grocery/lines";
import { readOffline, rememberOffline } from "@/lib/offline/store";

type GroceryRow = Omit<GroceryItem, "amount" | "sources"> & {
  amount: number | string | null;
  sources: string[] | null;
};

function asItem(row: GroceryRow): GroceryItem {
  return {
    ...row,
    amount: row.amount === null ? null : Number(row.amount),
    sources: row.sources ?? [],
  };
}

async function client() {
  const supabase = createBrowserSupabase();
  if (!supabase) throw new Error("The list is not connected yet. Start the local database, then try again.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Log in again to use your list.");
  return { supabase, userId: data.user.id };
}

export async function loadList() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = await readOffline<Awaited<ReturnType<typeof loadListOnline>>>("grocery");
    if (cached) return cached;
  }
  try {
    const result = await loadListOnline();
    void rememberOffline("grocery", result);
    return result;
  } catch (error) {
    const cached = await readOffline<Awaited<ReturnType<typeof loadListOnline>>>("grocery");
    if (cached) return cached;
    throw error;
  }
}

async function loadListOnline() {
  const { supabase } = await client();
  const [items, pantry, week] = await Promise.all([
    supabase.from("grocery_items").select("*").order("name"),
    supabase.from("pantry_items").select("id, food_slug, name, purchased_on, expires_on").order("name"),
    supabase.from("week_recipes").select("id, recipe_slug, position").order("position"),
  ]);
  if (items.error) throw new Error(items.error.message);
  if (pantry.error) throw new Error(pantry.error.message);
  if (week.error) throw new Error(week.error.message);
  return {
    items: (items.data as GroceryRow[]).map(asItem),
    pantry: pantry.data as PantryItem[],
    week: week.data as WeekRecipe[],
  };
}

export async function addRecipesToList(recipes: Recipe[], foods: Food[], options?: { skipPantry?: boolean }) {
  if (recipes.length === 0) return { added: 0, skipped: [] as string[] };
  const { supabase, userId } = await client();
  const today = todayISO();
  const [existingResult, pantryResult] = await Promise.all([
    supabase.from("grocery_items").select("*"),
    supabase.from("pantry_items").select("id, food_slug, name, purchased_on, expires_on"),
  ]);
  if (existingResult.error) throw new Error(existingResult.error.message);
  if (pantryResult.error) throw new Error(pantryResult.error.message);

  const pantry = pantryResult.data as PantryItem[];
  const skipped: string[] = [];
  const drafts = [];
  for (const draft of draftsForRecipes(recipes, foods)) {
    const food = foods.find((item) => item.slug === draft.foodSlug) ?? null;
    const held = options?.skipPantry === false ? null : pantryHit(pantry, food, draft.name, today);
    if (held) {
      const reason = held.expires_on
        ? `${draft.name} is in your pantry until ${held.expires_on}.`
        : `${draft.name} is in your pantry.`;
      if (!skipped.includes(reason)) skipped.push(reason);
      continue;
    }
    drafts.push(draft);
  }

  const merged = mergeDrafts(drafts);
  const existing = (existingResult.data as GroceryRow[]).map(asItem);
  const measuredFoods = new Set<string>();
  for (const draft of merged) {
    if (draft.amount !== null) measuredFoods.add(draft.foodSlug ?? normalizeName(draft.name));
  }
  for (const item of existing) {
    if (item.amount !== null) measuredFoods.add(item.food_slug ?? normalizeName(item.name));
  }
  const plainDupes = existing.filter(
    (item) => item.amount === null && measuredFoods.has(item.food_slug ?? normalizeName(item.name)),
  );
  if (plainDupes.length > 0) {
    const { error } = await supabase.from("grocery_items").delete().in(
      "id",
      plainDupes.map((item) => item.id),
    );
    if (error) throw new Error(error.message);
  }
  const byKey = new Map(existing.map((item) => [item.merge_key, item]));
  const toSave = merged.filter(
    (draft) => draft.amount !== null || !measuredFoods.has(draft.foodSlug ?? normalizeName(draft.name)),
  );
  const inserts = [];
  for (const draft of toSave) {
    const current = byKey.get(draft.mergeKey);
    if (!current) {
      inserts.push({
        user_id: userId,
        merge_key: draft.mergeKey,
        food_slug: draft.foodSlug,
        name: draft.name,
        amount: draft.amount,
        unit: draft.unit,
        aisle: draft.aisle,
        optional: draft.optional,
        sources: draft.sources,
      });
      continue;
    }
    const next = combineWithExisting(current, draft);
    const { error } = await supabase
      .from("grocery_items")
      .update({
        amount: next.amount,
        optional: next.optional,
        sources: next.sources,
        included: true,
        got: false,
      })
      .eq("id", current.id);
    if (error) throw new Error(error.message);
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("grocery_items").insert(inserts);
    if (error) throw new Error(error.message);
  }

  return { added: toSave.length, skipped };
}

export async function setItemIncluded(id: string, included: boolean) {
  const { supabase } = await client();
  const { error } = await supabase.from("grocery_items").update({ included }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setItemGot(id: string, got: boolean) {
  const { supabase } = await client();
  const { error } = await supabase.from("grocery_items").update({ got }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeItem(id: string) {
  const { supabase } = await client();
  const { error } = await supabase.from("grocery_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addToWeek(recipeSlug: string) {
  const { supabase, userId } = await client();
  const { data, error } = await supabase.from("week_recipes").select("recipe_slug, position");
  if (error) throw new Error(error.message);
  const rows = data as { recipe_slug: string; position: number }[];
  if (rows.some((row) => row.recipe_slug === recipeSlug)) return false;
  const position = rows.reduce((max, row) => Math.max(max, row.position), 0) + 1;
  const inserted = await supabase.from("week_recipes").insert({ user_id: userId, recipe_slug: recipeSlug, position });
  if (inserted.error) throw new Error(inserted.error.message);
  return true;
}

export async function removeFromWeek(id: string) {
  const { supabase } = await client();
  const { error } = await supabase.from("week_recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addPantryItem(input: {
  name: string;
  foodSlug: string | null;
  purchasedOn: string | null;
  expiresOn: string | null;
}) {
  const { supabase, userId } = await client();
  const { error } = await supabase.from("pantry_items").insert({
    user_id: userId,
    name: input.name,
    food_slug: input.foodSlug,
    purchased_on: input.purchasedOn,
    expires_on: input.expiresOn,
  });
  if (error) throw new Error(error.message);
}

export async function removePantryItem(id: string) {
  const { supabase } = await client();
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function ensureShare(rotate = false) {
  const { supabase, userId } = await client();
  const { data, error } = await supabase.from("list_shares").select("token").maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.token && !rotate) return data.token as string;
  const token = crypto.randomUUID();
  const saved = data?.token
    ? await supabase.from("list_shares").update({ token }).eq("user_id", userId)
    : await supabase.from("list_shares").insert({ user_id: userId, token });
  if (saved.error) throw new Error(saved.error.message);
  return token;
}
