"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/profile/save";
import { answerSummary, avoidNote, feedLabel } from "@/lib/profile/preferences";
import type { LifeStage, Profile } from "@/lib/profile/types";
import { deleteTemplate, type PlanTemplate } from "@/lib/plan/store";

const STAGES: { id: LifeStage; label: string }[] = [
  { id: "pregnancy", label: "Pregnancy" },
  { id: "breastfeeding", label: "Breastfeeding" },
  { id: "family", label: "Family meals" },
];

export function SettingsPanel({ initial, templates }: { initial: Profile; templates: PlanTemplate[] }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [savedWeeks, setSavedWeeks] = useState(templates);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const label = feedLabel(profile);
  const hidden = avoidNote(profile);

  async function choose(lifeStage: LifeStage) {
    const next = { ...profile, lifeStage };
    setProfile(next);
    setPending(true);
    setStatus(null);
    const message = await saveProfile(next);
    setPending(false);
    setStatus(message ?? "Saved.");
    if (!message) router.refresh();
  }

  return (
    <div className="max-w-xl">
      <fieldset>
        <legend className="font-display text-2xl font-bold">Life stage</legend>
        <p className="mt-2 text-base">This filters the recipes you see. You can switch whenever life changes.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={profile.lifeStage === stage.id}
              disabled={pending}
              onClick={() => void choose(stage.id)}
              className={`min-h-12 rounded-full border-2 px-4 text-base font-semibold ${
                profile.lifeStage === stage.id ? "border-ink bg-blush-deep" : "border-rose bg-white"
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </fieldset>
      {label ? <p className="mt-4 text-base">{label}</p> : null}
      {status ? (
        <p role="status" className="mt-2 text-base">
          {status}
        </p>
      ) : null}
      <section className="mt-8 rounded-[20px] bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Quiz</h2>
        <p className="mt-2 text-base">{answerSummary(profile)}</p>
        {hidden ? <p className="mt-2 text-base">{hidden}</p> : null}
        <Link href="/welcome" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-rose px-5 text-base font-semibold">
          {profile.onboarded ? "Edit my answers" : "Take the quiz"}
        </Link>
      </section>
      <section className="mt-8 rounded-[20px] bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Saved weeks</h2>
        {savedWeeks.length === 0 ? (
          <p className="mt-2 text-base">Save a week from the Week page, and it will show here.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {savedWeeks.map((template) => (
              <li key={template.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-semibold">{template.name}</span>
                <span className="flex gap-3">
                  <Link href={`/plan?template=${template.id}`} className="inline-flex min-h-11 items-center underline">
                    Use
                  </Link>
                  <button
                    type="button"
                    className="min-h-11 underline"
                    onClick={() => {
                      void deleteTemplate(template.id)
                        .then(() => setSavedWeeks(savedWeeks.filter((item) => item.id !== template.id)))
                        .catch(() => setStatus("That saved week was not deleted."));
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
