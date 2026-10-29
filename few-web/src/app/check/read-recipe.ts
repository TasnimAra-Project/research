"use server";

type ParsedRecipe = {
  title: string;
  sourceName: string;
  sourceUrl: string;
  ingredients: string[];
  steps: string[];
};

function privateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function textOf(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textOf);
  if (typeof value === "object" && value && "text" in value && typeof value.text === "string") return [value.text];
  return [];
}

function asRecipe(node: unknown): { name?: string; recipeIngredient?: unknown; recipeInstructions?: unknown } | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Recipe") && Array.isArray(record.recipeIngredient)) return record as { name?: string; recipeIngredient?: unknown; recipeInstructions?: unknown };
  if (Array.isArray(record["@graph"])) {
    for (const child of record["@graph"]) {
      const found = asRecipe(child);
      if (found) return found;
    }
  }
  return null;
}

export async function readRecipeUrl(raw: string): Promise<{ recipe: ParsedRecipe } | { error: string }> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "Paste a full link, starting with https://." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Use an http or https link." };
  if (privateHost(url.hostname)) return { error: "That link can't be checked from here." };

  let html = "";
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "FamiliesEatWell/1.0" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!response.ok) return { error: "That page did not open." };
    html = await response.text();
  } catch {
    return { error: "That page did not open." };
  }

  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const recipe = asRecipe(node);
        if (!recipe) continue;
        const ingredients = textOf(recipe.recipeIngredient).map((line) => line.trim()).filter(Boolean);
        const steps = textOf(recipe.recipeInstructions).map((line) => line.trim()).filter(Boolean);
        if (ingredients.length === 0) continue;
        return {
          recipe: {
            title: typeof recipe.name === "string" && recipe.name.trim() ? recipe.name.trim() : url.hostname,
            sourceName: url.hostname.replace(/^www\./, ""),
            sourceUrl: url.toString(),
            ingredients,
            steps,
          },
        };
      }
    } catch {
      continue;
    }
  }

  return { error: "We couldn't find a recipe on that page. Try a page that publishes its recipe for search engines." };
}
