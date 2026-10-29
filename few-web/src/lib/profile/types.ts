import type { DietTag } from "@/data/types";

export type LifeStage = "pregnancy" | "breastfeeding" | "family";
export type Skill = "starting" | "comfortable" | "confident";
export type WeeknightMinutes = 15 | 30 | 40;
export type Trimester = 1 | 2 | 3;

export type Profile = {
  lifeStage: LifeStage | null;
  trimester: Trimester | null;
  dueDate: string | null;
  diets: DietTag[];
  allergies: string[];
  dislikes: string;
  skill: Skill | null;
  weeknightMinutes: WeeknightMinutes | null;
  budgetPerServing: number | null;
  onboarded: boolean;
};

export const emptyProfile: Profile = {
  lifeStage: null,
  trimester: null,
  dueDate: null,
  diets: [],
  allergies: [],
  dislikes: "",
  skill: null,
  weeknightMinutes: null,
  budgetPerServing: null,
  onboarded: false,
};

export const ALLERGIES: { id: string; label: string; terms: string[] }[] = [
  { id: "milk", label: "Milk", terms: ["milk", "cheese", "yogurt", "butter", "cream"] },
  { id: "eggs", label: "Eggs", terms: ["egg"] },
  { id: "peanuts", label: "Peanuts", terms: ["peanut"] },
  { id: "tree-nuts", label: "Tree nuts", terms: ["almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut"] },
  { id: "fish", label: "Fish", terms: ["fish", "salmon", "tuna", "tilapia", "sardine", "cod", "anchovy"] },
  { id: "shellfish", label: "Shellfish", terms: ["shrimp", "crab", "lobster"] },
  { id: "soy", label: "Soy", terms: ["soy", "tofu", "edamame"] },
  { id: "wheat", label: "Wheat", terms: ["wheat", "flour", "bread", "pasta", "tortilla"] },
  { id: "sesame", label: "Sesame", terms: ["sesame", "tahini"] },
];

export const DIET_CHOICES: { id: DietTag; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "gluten-free option", label: "Gluten-free when I can" },
];

const DIETS = new Set<string>(DIET_CHOICES.map((item) => item.id));
const ALLERGY_IDS = new Set(ALLERGIES.map((item) => item.id));
const STAGES = new Set<string>(["pregnancy", "breastfeeding", "family"]);
const SKILLS = new Set<string>(["starting", "comfortable", "confident"]);
const MINUTES = new Set<number>([15, 30, 40]);
const BUDGETS = new Set<number>([1.5, 2, 3]);

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asList(value: unknown, allowed: Set<string>) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && allowed.has(item));
}

export function profileFromRow(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  const stage = asString(row.life_stage);
  const skill = asString(row.skill);
  const trimester = typeof row.trimester === "number" ? row.trimester : Number(row.trimester);
  const minutes = typeof row.weeknight_minutes === "number" ? row.weeknight_minutes : Number(row.weeknight_minutes);
  const budget = typeof row.budget_per_serving === "number" ? row.budget_per_serving : Number(row.budget_per_serving);
  const due = asString(row.due_date);
  return {
    lifeStage: stage && STAGES.has(stage) ? (stage as LifeStage) : null,
    trimester: trimester === 1 || trimester === 2 || trimester === 3 ? trimester : null,
    dueDate: due && /^\d{4}-\d{2}-\d{2}/.test(due) ? due.slice(0, 10) : null,
    diets: asList(row.diets, DIETS) as DietTag[],
    allergies: asList(row.allergies, ALLERGY_IDS),
    dislikes: asString(row.dislikes)?.slice(0, 200) ?? "",
    skill: skill && SKILLS.has(skill) ? (skill as Skill) : null,
    weeknightMinutes: MINUTES.has(minutes) ? (minutes as WeeknightMinutes) : null,
    budgetPerServing: BUDGETS.has(budget) ? budget : null,
    onboarded: row.onboarded === true,
  };
}

export function profileToRow(profile: Profile) {
  return {
    life_stage: profile.lifeStage,
    trimester: profile.trimester,
    due_date: profile.dueDate,
    diets: profile.diets.filter((item) => DIETS.has(item)),
    allergies: profile.allergies.filter((item) => ALLERGY_IDS.has(item)),
    dislikes: profile.dislikes.trim().slice(0, 200),
    skill: profile.skill,
    weeknight_minutes: profile.weeknightMinutes,
    budget_per_serving: profile.budgetPerServing,
    onboarded: profile.onboarded,
    updated_at: new Date().toISOString(),
  };
}
