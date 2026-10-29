export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Stage = "pregnancy" | "breastfeeding" | "both";
export type Verdict = "okay" | "okay_if_prepared" | "limit" | "avoid" | "unknown";
export type EffortTag = "no-cook" | "one-pot" | "sheet-pan" | "make-ahead";
export type DietTag = "vegetarian" | "vegan" | "pescatarian" | "gluten-free option";

export type EvidenceLink = {
  label: string;
  url: string;
};

export type Ingredient = {
  display: string;
  food_slug: string | null;
  amount: number | null;
  unit: string | null;
  item: string;
  optional: boolean;
  alternate_food_slug: string | null;
};

export type Step = {
  text: string;
  timer_seconds: number | null;
};

export type Recipe = {
  slug: string;
  title: string;
  description: string | null;
  meal: Meal;
  meals: Meal[];
  servings: number;
  servings_label: string | null;
  prep_min: number;
  cook_min: number;
  total_min: number;
  inactive_time_note: string | null;
  total_cost: number;
  cost_is_approximate: boolean;
  cost_store: string | null;
  cost_checked_date: string | null;
  effort_tags: EffortTag[];
  diet_tags: DietTag[];
  wic_friendly: boolean | null;
  stage: Stage;
  chef_tips: string[];
  superfood_spotlight: string | null;
  nutrition_highlights: string[];
  benefits: string[];
  evidence_links: EvidenceLink[];
  photo_url: string | null;
  reviewed_by: string | null;
  reviewed_date: string | null;
  safety_note: string | null;
  source_document: string;
  ingredients: Ingredient[];
  steps: Step[];
};

export type Food = {
  slug: string;
  name: string;
  aliases: string[];
  preparation: string | null;
  verdict: Verdict;
  reason: string | null;
  safe_version: string | null;
  source_name: string | null;
  source_url: string | null;
};

export type Price = {
  store: string;
  product: string | null;
  price_min: number;
  price_max: number;
  unit: string | null;
  approximate: boolean;
  checked_date: string | null;
};

export type Superfood = {
  slug: string;
  name: string;
  group_name: "core" | "pantry" | "snack" | "profiled";
  food_slug: string | null;
  key_nutrients: string | null;
  meal_ideas: string | null;
  nutrition_per_100g: Record<string, unknown> | null;
  nutrition_state: string | null;
  benefits: string | null;
  prices: Price[];
  difficulty: string | null;
  best_value_rank: number | null;
  best_value_label: string | null;
  best_value_reason: string | null;
  source_documents: string[];
};

export type Resource = {
  category: "video" | "evidence";
  title: string;
  description: string | null;
  url: string;
  recipe_slug: string | null;
};

export type NutrientRole = {
  nutrient: string;
  food_examples: string;
  source_note: string;
};

export type SeedFile = {
  foods: Food[];
  recipes: Recipe[];
  superfoods: Superfood[];
  resources: Resource[];
  nutrient_roles: NutrientRole[];
};
