"use server";

type ProductPayload = {
  status?: number;
  product?: { product_name?: string; ingredients_text?: string; ingredients_text_en?: string };
};

function ingredientsFrom(payload: ProductPayload) {
  const text = payload.product?.ingredients_text_en || payload.product?.ingredients_text || "";
  return text
    .split(/[,;]/)
    .map((part) => part.replace(/\([^)]*\)/g, "").trim())
    .filter((part) => part.length > 1)
    .slice(0, 40);
}

async function readProduct(code: string): Promise<{ error: string } | { name: string; ingredients: string[] } | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=status,product_name,ingredients_text,ingredients_text_en`,
    {
      headers: { accept: "application/json", "user-agent": "FamiliesEatWell/1.0 (local recipe app)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) return { error: "The product list did not answer. Wait a moment and try the number again." };
  const payload = (await response.json()) as ProductPayload;
  if (payload.status !== 1 || !payload.product) return null;
  const ingredients = ingredientsFrom(payload);
  if (ingredients.length === 0) return { error: "That product has no ingredient list to check." };
  return { name: payload.product.product_name?.trim() || "Scanned product", ingredients };
}

export async function lookupBarcode(raw: string): Promise<{ error: string } | { name: string; ingredients: string[] }> {
  const code = raw.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) return { error: "Enter the barcode number under the bars, 8 to 14 digits." };
  const tries = code.length === 12 ? [code, `0${code}`] : [code];
  try {
    for (const attempt of tries) {
      const found = await readProduct(attempt);
      if (found) return found;
    }
  } catch {
    return { error: "The product list did not answer. You do not need an account. Check your connection and try again." };
  }
  return { error: "That barcode is not in the free product list. Type the food name in the search above." };
}
