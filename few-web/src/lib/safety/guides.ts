export type OfficialGuide = {
  id: string;
  title: string;
  source: string;
  url: string;
};

export const GUIDES: OfficialGuide[] = [
  {
    id: "pregnancy",
    title: "People at Risk: Pregnant Women",
    source: "FoodSafety.gov",
    url: "https://www.foodsafety.gov/people-at-risk/pregnant-women",
  },
  {
    id: "temperatures",
    title: "Safe minimum cooking temperatures",
    source: "FoodSafety.gov",
    url: "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
  },
  {
    id: "produce",
    title: "Wash fruits and vegetables",
    source: "FoodSafety.gov",
    url: "https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety",
  },
  {
    id: "fish",
    title: "Advice about eating fish",
    source: "FDA",
    url: "https://www.fda.gov/food/consumers/advice-about-eating-fish",
  },
  {
    id: "alcohol",
    title: "Alcohol and pregnancy",
    source: "CDC",
    url: "https://www.cdc.gov/alcohol-pregnancy/about/index.html",
  },
  {
    id: "caffeine",
    title: "How much coffee can I drink while pregnant?",
    source: "ACOG",
    url: "https://www.acog.org/womens-health/experts-and-stories/ask-acog/how-much-coffee-can-i-drink-while-pregnant",
  },
];

const BY_ID = new Map(GUIDES.map((guide) => [guide.id, guide]));

export function guidesById(ids: string[]) {
  const found: OfficialGuide[] = [];
  for (const id of ids) {
    const guide = BY_ID.get(id);
    if (guide && !found.some((item) => item.id === guide.id)) found.push(guide);
  }
  return found;
}

export function guidesForName(name: string) {
  const text = name.toLowerCase();
  let ids = ["pregnancy"];
  if (/\b(wine|beer|alcohol|liquor|vodka|rum|cocktail)\b/.test(text)) ids = ["alcohol"];
  else if (/\b(coffee|caffeine|espresso|matcha)\b/.test(text)) ids = ["caffeine"];
  else if (/\b(fish|salmon|tuna|shrimp|seafood|anchovy|sardine|tilapia|cod|crab|lobster|sushi)\b/.test(text)) ids = ["fish", "temperatures"];
  else if (/\b(chicken|poultry|turkey|beef|pork|lamb|meat|thigh|steak|bacon|sausage|ham|egg|eggs)\b/.test(text)) ids = ["temperatures", "pregnancy"];
  else if (/\b(broth|stock|bouillon)\b/.test(text)) ids = ["pregnancy"];
  else if (/\b(salt|pepper|paprika|cumin|turmeric|thyme|basil|oregano|cinnamon|ginger|spice|seasoning)\b/.test(text)) ids = ["pregnancy"];
  else if (/\b(sprouts?|lettuce|spinach|salads?|tomatoes?|melons?|berries|berry|onions?|garlic|broccoli|carrots?|fruits?|vegetables?|cucumbers?|kale)\b/.test(text)) {
    ids = ["produce", "pregnancy"];
  }
  return guidesById(ids);
}
