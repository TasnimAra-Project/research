import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { GroceryApp } from "@/components/list/GroceryApp";
import { seedData } from "@/data";
import { createServerSupabase } from "@/lib/supabase/server";

async function ListGate() {
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");

  return (
    <GroceryApp
      recipes={seedData.recipes}
      foods={seedData.foods}
      amazonTag={process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG ?? ""}
      walmartEnabled={process.env.WALMART_ENABLED === "true"}
      instacartEnabled={process.env.INSTACART_ENABLED === "true"}
      instacartUrl={process.env.INSTACART_PAGE_URL ?? ""}
    />
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <ListGate />
    </Suspense>
  );
}
