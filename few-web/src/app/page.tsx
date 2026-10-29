import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { createServerSupabase } from "@/lib/supabase/server";

async function HomeGate() {
  await connection();
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/recipes");
  }

  return (
    <main id="main" className="flex min-h-full items-center justify-center px-4 py-10">
      <AuthForm />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <HomeGate />
    </Suspense>
  );
}
