import type { Profile, Trimester } from "@/lib/profile/types";
import { ALLERGIES } from "@/lib/profile/types";
import { emptyRecipeQuery, type RecipeQuery } from "@/lib/recipes/query";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function trimesterFromDue(dueDate: string, today = new Date()): Trimester | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate);
  if (!match) return null;
  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const daysUntil = Math.round((due.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  const weeks = 40 - daysUntil / 7;
  if (weeks < 1 || weeks > 42) return null;
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

export function trimesterLabel(trimester: Trimester) {
  if (trimester === 1) return "first trimester";
  if (trimester === 2) return "second trimester";
  return "third trimester";
}

export function dueLabel(dueDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `due ${month} ${Number(match[3])}, ${match[1]}`;
}

export function feedLabel(profile: Profile | null) {
  if (!profile?.lifeStage) return null;
  if (profile.lifeStage === "family") return "Family meals";
  if (profile.lifeStage === "breastfeeding") return "For breastfeeding";
  const trimester = profile.dueDate ? trimesterFromDue(profile.dueDate) : profile.trimester;
  const due = profile.dueDate ? dueLabel(profile.dueDate) : null;
  if (trimester && due) return `For pregnancy, ${trimesterLabel(trimester)}, ${due}`;
  if (trimester) return `For pregnancy, ${trimesterLabel(trimester)}`;
  if (due) return `For pregnancy, ${due}`;
  return "For pregnancy";
}

export function dislikeTerms(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 12);
}

export function avoidTermsFor(profile: Profile | null) {
  if (!profile) return [];
  const fromAllergies = profile.allergies.flatMap((id) => ALLERGIES.find((item) => item.id === id)?.terms ?? []);
  return [...fromAllergies, ...dislikeTerms(profile.dislikes)];
}

export function avoidNote(profile: Profile | null) {
  if (!profile) return null;
  const names = [
    ...profile.allergies.map((id) => ALLERGIES.find((item) => item.id === id)?.label).filter((item): item is string => Boolean(item)),
    ...dislikeTerms(profile.dislikes),
  ];
  if (names.length === 0) return null;
  return `Hiding recipes with ${names.join(", ")}.`;
}

export function profileToQuery(profile: Profile | null): RecipeQuery {
  const query: RecipeQuery = { ...emptyRecipeQuery, have: ["", "", ""], diets: [], stages: [], avoidTerms: [] };
  if (!profile) return query;
  if (profile.lifeStage === "pregnancy") query.stages = ["pregnancy"];
  if (profile.lifeStage === "breastfeeding") query.stages = ["breastfeeding"];
  query.diets = [...profile.diets];
  const caps = [profile.weeknightMinutes, profile.skill === "starting" ? 30 : null].filter((item): item is number => item !== null);
  query.maxMinutes = caps.length > 0 ? Math.min(...caps) : null;
  query.maxCost = profile.budgetPerServing;
  query.avoidTerms = avoidTermsFor(profile);
  return query;
}

export function answerSummary(profile: Profile | null) {
  const hasAnswers = Boolean(
    profile &&
      (profile.onboarded ||
        profile.diets.length ||
        profile.allergies.length ||
        profile.skill ||
        profile.weeknightMinutes ||
        profile.budgetPerServing ||
        profile.dislikes.trim()),
  );
  if (!hasAnswers) return "You have not taken the quiz yet.";
  const dietNames: Record<string, string> = {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    pescatarian: "Pescatarian",
    "gluten-free option": "Gluten-free when you can",
  };
  const parts: string[] = [];
  if (profile?.diets.length) parts.push(profile.diets.map((id) => dietNames[id] ?? id).join(", "));
  if (profile?.skill === "starting") parts.push("Shorter recipes while you are starting out");
  if (profile?.skill === "comfortable") parts.push("Comfortable following a recipe");
  if (profile?.skill === "confident") parts.push("Happy with a longer recipe");
  if (profile?.weeknightMinutes) parts.push(`Weeknights up to ${profile.weeknightMinutes} minutes`);
  if (profile?.budgetPerServing) {
    const amount = profile.budgetPerServing % 1 === 0 ? String(profile.budgetPerServing) : profile.budgetPerServing.toFixed(2);
    parts.push(`About $${amount} a serving`);
  }
  if (profile?.dislikes.trim()) parts.push(`Skipping ${profile.dislikes.trim()}`);
  if (parts.length === 0) return "No extra filters yet.";
  return `${parts.join(". ")}.`;
}
