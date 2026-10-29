// Ingredient to Amazon ASIN map. Edit this file.
// quantity is how many of that Amazon product to add. It is not the recipe amount
// (2 cups of oats is not 2 Amazon units). Leave this list empty until you add real ASINs.
// Do not guess an ASIN.

export type AsinMapEntry = {
  food_slug: string;
  asin: string;
  quantity: number;
};

export const ASIN_MAP: AsinMapEntry[] = [];

export function asinFor(foodSlug: string | null) {
  if (!foodSlug) return null;
  const entry = ASIN_MAP.find((item) => item.food_slug === foodSlug && /^[A-Z0-9]{10}$/.test(item.asin));
  if (!entry) return null;
  return { asin: entry.asin, quantity: Math.max(1, Math.round(entry.quantity || 1)) };
}
