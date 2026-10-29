"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveProfile } from "@/lib/profile/save";
import { ALLERGIES, DIET_CHOICES, type LifeStage, type Profile, type Skill, type Trimester, type WeeknightMinutes } from "@/lib/profile/types";

const STAGES: { id: LifeStage; label: string; detail: string }[] = [
  { id: "pregnancy", label: "Pregnant", detail: "Recipes for pregnancy" },
  { id: "breastfeeding", label: "Breastfeeding", detail: "Recipes for breastfeeding" },
  { id: "family", label: "Family meals", detail: "Recipes for the whole table" },
];

const SKILLS: { id: Skill; label: string }[] = [
  { id: "starting", label: "I'm just starting" },
  { id: "comfortable", label: "I can follow a recipe" },
  { id: "confident", label: "I like a challenge" },
];

const TIMES: { id: WeeknightMinutes | null; label: string }[] = [
  { id: 15, label: "15 minutes" },
  { id: 30, label: "30 minutes" },
  { id: 40, label: "40 minutes" },
  { id: null, label: "I have more time" },
];

const BUDGETS: { id: number | null; label: string }[] = [
  { id: 1.5, label: "About $1.50" },
  { id: 2, label: "About $2" },
  { id: 3, label: "About $3" },
  { id: null, label: "Not the main worry" },
];

function Choice({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-12 rounded-full border-2 px-4 text-base font-semibold ${pressed ? "border-ink bg-blush-deep" : "border-rose bg-white"}`}
    >
      {children}
    </button>
  );
}

export function OnboardingQuiz({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Profile>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const steps = useMemo(() => {
    const names = ["stage", "diet", "allergies", "dislikes", "skill", "time", "budget"];
    if (draft.lifeStage === "pregnancy") names.splice(1, 0, "due");
    return names;
  }, [draft.lifeStage]);

  const current = steps[Math.min(step, steps.length - 1)];

  function toggleList(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  async function save(next: Profile, href: string) {
    setPending(true);
    setError(null);
    const message = await saveProfile(next);
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    router.push(href);
    router.refresh();
  }

  function goNext() {
    if (current === "stage" && !draft.lifeStage) return;
    if (step >= steps.length - 1) {
      void save({ ...draft, onboarded: true }, "/recipes");
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <div className="max-w-xl">
      <p className="text-base">
        Question {Math.min(step, steps.length - 1) + 1} of {steps.length}
      </p>
      {current === "stage" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">Where are you right now?</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {STAGES.map((stage) => (
              <Choice key={stage.id} pressed={draft.lifeStage === stage.id} onClick={() => setDraft({ ...draft, lifeStage: stage.id })}>
                {stage.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {current === "due" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">Trimester or due date</legend>
          <p className="mt-2 text-base">Either one is enough.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {([1, 2, 3] as Trimester[]).map((trimester) => (
              <Choice
                key={trimester}
                pressed={draft.trimester === trimester && !draft.dueDate}
                onClick={() => setDraft({ ...draft, trimester, dueDate: null })}
              >
                {trimester === 1 ? "First trimester" : trimester === 2 ? "Second trimester" : "Third trimester"}
              </Choice>
            ))}
          </div>
          <label htmlFor="due-date" className="mt-4 block text-base font-semibold">
            Due date
          </label>
          <input
            id="due-date"
            type="date"
            value={draft.dueDate ?? ""}
            onChange={(event) => setDraft({ ...draft, dueDate: event.target.value || null, trimester: event.target.value ? null : draft.trimester })}
            className="mt-2 min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
          />
        </fieldset>
      ) : null}
      {current === "diet" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">How do you like to eat?</legend>
          <p className="mt-2 text-base">Choose any that fit. Skip this if you have no rules.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DIET_CHOICES.map((diet) => (
              <Choice key={diet.id} pressed={draft.diets.includes(diet.id)} onClick={() => setDraft({ ...draft, diets: toggleList(draft.diets, diet.id) as Profile["diets"] })}>
                {diet.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {current === "allergies" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">Anything you need to avoid?</legend>
          <p className="mt-2 text-base">Recipes with these foods stay off your list.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ALLERGIES.map((allergy) => (
              <Choice
                key={allergy.id}
                pressed={draft.allergies.includes(allergy.id)}
                onClick={() => setDraft({ ...draft, allergies: toggleList(draft.allergies, allergy.id) })}
              >
                {allergy.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {current === "dislikes" ? (
        <div className="mt-4">
          <label htmlFor="dislikes" className="font-display text-3xl font-bold">
            Foods you would rather skip
          </label>
          <p className="mt-2 text-base">Separate them with commas. This can stay empty.</p>
          <input
            id="dislikes"
            value={draft.dislikes}
            placeholder="mushrooms, olives"
            onChange={(event) => setDraft({ ...draft, dislikes: event.target.value })}
            className="mt-4 min-h-11 w-full rounded-2xl border-2 border-rose bg-white px-4 text-base"
          />
        </div>
      ) : null}
      {current === "skill" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">How do you feel about cooking?</legend>
          <p className="mt-2 text-base">Just starting keeps the list to about 30 minutes.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <Choice key={skill.id} pressed={draft.skill === skill.id} onClick={() => setDraft({ ...draft, skill: skill.id })}>
                {skill.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {current === "time" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">How long is a weeknight?</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {TIMES.map((time) => (
              <Choice key={time.label} pressed={draft.weeknightMinutes === time.id} onClick={() => setDraft({ ...draft, weeknightMinutes: time.id })}>
                {time.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {current === "budget" ? (
        <fieldset className="mt-4">
          <legend className="font-display text-3xl font-bold">What feels comfortable per serving?</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {BUDGETS.map((budget) => (
              <Choice
                key={budget.label}
                pressed={draft.budgetPerServing === budget.id}
                onClick={() => setDraft({ ...draft, budgetPerServing: budget.id })}
              >
                {budget.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-base">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {step > 0 ? (
          <Button variant="secondary" disabled={pending} onClick={() => setStep((value) => Math.max(0, value - 1))}>
            Back
          </Button>
        ) : null}
        <Button disabled={pending || (current === "stage" && !draft.lifeStage)} onClick={goNext}>
          {pending ? "Saving" : step >= steps.length - 1 ? "See my recipes" : "Next"}
        </Button>
        <Button variant="quiet" disabled={pending} onClick={() => void save({ ...draft, onboarded: true }, "/recipes")}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
