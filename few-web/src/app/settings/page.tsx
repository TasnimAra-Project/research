import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { loadProfile } from "@/lib/profile/load";
import { emptyProfile } from "@/lib/profile/types";
import type { PlanSlot } from "@/lib/plan/fill";
import type { PlanTemplate } from "@/lib/plan/store";
import { createServerSupabase } from "@/lib/supabase/server";

async function SettingsGate() {
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  const profile = (await loadProfile(data.user.id)) ?? emptyProfile;
  const templateResult = await supabase.from("plan_templates").select("id, name, slots").eq("user_id", data.user.id).order("created_at", { ascending: false });
  const templates: PlanTemplate[] = templateResult.error
    ? []
    : (templateResult.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        slots: (row.slots as PlanSlot[]) ?? [],
      }));

  return (
    <main id="main" className="min-h-full px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <div className="mt-6">
        <SettingsPanel initial={profile} templates={templates} />
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <SettingsGate />
    </Suspense>
  );
}
