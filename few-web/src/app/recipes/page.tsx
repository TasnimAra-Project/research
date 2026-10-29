import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { RecipeBoard } from "@/components/recipes/RecipeBoard";
import { RememberRecipes } from "@/components/offline/RememberRecipes";
import { seedData } from "@/data";
import { loadProfile } from "@/lib/profile/load";
import { avoidNote, feedLabel, profileToQuery } from "@/lib/profile/preferences";
import { createServerSupabase } from "@/lib/supabase/server";

async function RecipesGate({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const recipe = typeof params.recipe === "string" ? params.recipe : null;
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  const profile = await loadProfile(data.user.id);

  return (
    <>
    <RememberRecipes recipes={seedData.recipes} />
    <RecipeBoard
      recipes={seedData.recipes}
      foods={seedData.foods}
      selectedSlug={recipe}
      preferences={profileToQuery(profile)}
      feedLabel={feedLabel(profile)}
      avoidNote={avoidNote(profile)}
    />
    </>
  );
}

export default function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ recipe?: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <RecipesGate searchParams={searchParams} />
    </Suspense>
  );
}
