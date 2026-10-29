import type { Meal } from "@/data/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(amount: number, approximate = false) {
  const formatted = money.format(amount);
  return approximate ? `About ${formatted}` : formatted;
}

export function costPerServing(total: number, servings: number) {
  return Math.round((total / servings) * 100) / 100;
}

export function formatCook(minutes: number) {
  if (minutes === 0) return "None";
  return `${minutes} min`;
}

export function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

export function formatTimer(seconds: number) {
  if (seconds % 3600 === 0) return `${seconds / 3600} hr`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function formatMeal(meal: Meal) {
  return MEAL_LABEL[meal];
}

export function formatStage(stage: "pregnancy" | "breastfeeding" | "both") {
  if (stage === "both") return "Pregnancy and breastfeeding";
  if (stage === "pregnancy") return "Pregnancy";
  return "Breastfeeding";
}
