import { Suspense } from "react";
import { connection } from "next/server";
import { AISLE_ORDER } from "@/data/aisles";
import { seedData } from "@/data";
import { formatGroceryLine, type GroceryItem } from "@/lib/grocery/lines";
import { createServerSupabase } from "@/lib/supabase/server";

type SharedItem = {
  name: string;
  amount: number | string | null;
  unit: string | null;
  aisle: string;
  included: boolean;
  got: boolean;
  optional: boolean;
  food_slug: string | null;
  sources: string[];
};

type SharedPlan = {
  recipes: { recipe_slug: string; position: number }[];
  items: SharedItem[];
};

async function ShareGate({ token }: { token: string }) {
  await connection();
  const supabase = await createServerSupabase();
  const titles = new Map(seedData.recipes.map((recipe) => [recipe.slug, recipe.title]));

  if (!supabase) {
    return <p className="text-base">This invite cannot be opened until the database is connected.</p>;
  }

  const { data, error } = await supabase.rpc("shared_plan", { share_token: token });
  if (error) return <p className="text-base">This invite could not be opened. {error.message}</p>;
  if (!data) return <p className="text-base">This invite link is not active.</p>;

  const plan = data as SharedPlan;
  const items: GroceryItem[] = plan.items.map((item, index) => ({
    id: String(index),
    merge_key: String(index),
    food_slug: item.food_slug,
    name: item.name,
    amount: item.amount === null ? null : Number(item.amount),
    unit: item.unit,
    aisle: item.aisle,
    included: item.included,
    got: item.got,
    optional: item.optional,
    sources: Array.isArray(item.sources) ? item.sources : [],
  }));
  const aisles = [
    ...AISLE_ORDER.filter((aisle) => items.some((item) => item.aisle === aisle)),
    ...[...new Set(items.map((item) => item.aisle))].filter((aisle) => !AISLE_ORDER.includes(aisle as (typeof AISLE_ORDER)[number])),
  ];

  return (
    <>
      <section>
        <h2 className="font-display text-2xl font-bold">This week</h2>
        {plan.recipes.length === 0 ? (
          <p className="mt-2 text-base">No recipes on the week.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
            {plan.recipes.map((recipe) => (
              <li key={recipe.recipe_slug}>{titles.get(recipe.recipe_slug) ?? recipe.recipe_slug}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-6">
        <h2 className="font-display text-2xl font-bold">Shopping list</h2>
        {items.length === 0 ? <p className="mt-2 text-base">The list is empty.</p> : null}
        {aisles.map((aisle) => (
          <div key={aisle} className="mt-4">
            <h3 className="font-display text-xl font-bold">{aisle}</h3>
            <ul className="mt-2 space-y-2 text-base">
              {items
                .filter((item) => item.aisle === aisle)
                .map((item) => (
                  <li key={`${item.name}-${item.unit ?? ""}-${item.amount ?? ""}`}>
                    {formatGroceryLine(item)}
                    {item.included ? "" : ", left off the send"}
                    {item.got ? ", got it" : ""}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <ShareFrame params={params} />
    </Suspense>
  );
}

async function ShareFrame({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return (
    <main id="main" className="min-h-full px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Shared plan</h1>
      <p className="mt-2 mb-6 text-base">A partner shared this week and shopping list. You check out on the store&apos;s site. This site does not take payment.</p>
      <ShareGate token={token} />
    </main>
  );
}
