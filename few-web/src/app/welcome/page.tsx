import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { OnboardingQuiz } from "@/components/settings/OnboardingQuiz";
import { loadProfile } from "@/lib/profile/load";
import { emptyProfile } from "@/lib/profile/types";
import { createServerSupabase } from "@/lib/supabase/server";

async function WelcomeGate() {
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  const profile = (await loadProfile(data.user.id)) ?? emptyProfile;

  return (
    <main id="main" className="min-h-full px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Welcome</h1>
      <p className="mt-2 max-w-xl text-base">A few quick questions so the recipes fit your week. You can skip any of them, and change them later in Settings.</p>
      <div className="mt-6">
        <OnboardingQuiz initial={profile} />
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <WelcomeGate />
    </Suspense>
  );
}
