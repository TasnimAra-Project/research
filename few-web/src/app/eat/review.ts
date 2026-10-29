"use server";

import { seedData } from "@/data";
import type { Food, Verdict } from "@/data/types";
import { matchFood } from "@/lib/safety/check";
import { GUIDES, guidesById, guidesForName, type OfficialGuide } from "@/lib/safety/guides";
import { readRecipeUrl } from "@/app/check/read-recipe";

export type ReviewedFood = {
  name: string;
  verdict: Verdict | null;
  reason: string | null;
  safeVersion: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  guides: OfficialGuide[];
};

type ModelPick = {
  food_slug?: unknown;
  guide_ids?: unknown;
};

function verified(food: Food | null | undefined) {
  return food && food.verdict !== "unknown" ? food : null;
}

function fromFood(name: string, food: Food): ReviewedFood {
  return {
    name,
    verdict: food.verdict,
    reason: food.reason,
    safeVersion: food.safe_version,
    sourceName: food.source_name,
    sourceUrl: food.source_url,
    guides: [],
  };
}

function fromGuides(name: string, guides: OfficialGuide[]): ReviewedFood {
  return {
    name,
    verdict: null,
    reason: null,
    safeVersion: null,
    sourceName: null,
    sourceUrl: null,
    guides: guides.length > 0 ? guides : guidesForName(name),
  };
}

function catalog() {
  return seedData.foods
    .filter((food) => food.verdict !== "unknown")
    .map((food) => `${food.slug} | ${food.name} | ${food.aliases.join(", ")}`)
    .join("\n");
}

async function askGemini(names: string[]) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const prompt = [
    "Match each food name to a verified food, or choose official pages. Do not say if a food is safe, unsafe, okay, or limited.",
    "Verified foods, one per line, as slug | name | aliases:",
    catalog(),
    "Official page ids:",
    GUIDES.map((guide) => `${guide.id}: ${guide.source}, ${guide.title}`).join("\n"),
    "Return JSON only: {\"items\":[{\"food_slug\":string|null,\"guide_ids\":string[]}]}",
    "Use the same order as the names. food_slug must be a slug from the list, or null.",
    "If food_slug is set, guide_ids must be []. If food_slug is null, choose 1 or 2 page ids from the list.",
    "Names:",
    JSON.stringify(names),
  ].join("\n\n");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const parsed = JSON.parse(text.slice(start, end + 1)) as { items?: ModelPick[] };
  return Array.isArray(parsed.items) ? parsed.items : null;
}

export async function reviewFoods(names: string[]): Promise<ReviewedFood[]> {
  const cleaned = names.map((name) => name.trim()).filter(Boolean).slice(0, 40);
  const local = cleaned.map((name) => verified(matchFood(seedData.foods, name)));
  let picks: ModelPick[] | null = null;
  if (local.some((food) => !food)) {
    try {
      picks = await askGemini(cleaned);
    } catch {
      picks = null;
    }
  }

  return cleaned.map((name, index) => {
    const known = local[index];
    if (known) return fromFood(name, known);
    const pick = picks?.[index];
    const slug = typeof pick?.food_slug === "string" ? pick.food_slug : "";
    const matched = verified(seedData.foods.find((food) => food.slug === slug));
    if (matched) return fromFood(name, matched);
    const ids = Array.isArray(pick?.guide_ids) ? pick.guide_ids.filter((id): id is string => typeof id === "string") : [];
    const chosen = guidesById(ids);
    return fromGuides(name, chosen.length > 0 ? chosen : guidesForName(name));
  });
}

export async function reviewRecipePage(raw: string): Promise<{ error: string } | { title: string; sourceName: string; sourceUrl: string; items: ReviewedFood[] }> {
  const result = await readRecipeUrl(raw);
  if ("error" in result) return result;
  const items = await reviewFoods(result.recipe.ingredients);
  return {
    title: result.recipe.title,
    sourceName: result.recipe.sourceName,
    sourceUrl: result.recipe.sourceUrl,
    items,
  };
}
