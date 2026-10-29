"use server";

function privateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export async function readImageLink(raw: string): Promise<{ dataUrl: string } | { error: string }> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "Paste a full picture link, starting with https://." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Use an http or https picture link." };
  if (privateHost(url.hostname)) return { error: "That link can't be opened from here." };

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "FamiliesEatWell/1.0" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!response.ok) return { error: "That picture did not open." };
    const type = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!type.startsWith("image/")) {
      return { error: "That link is not a picture. Drop the image file, or paste a link that goes straight to a .jpg or .png." };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 6_000_000) return { error: "That picture is too large." };
    return { dataUrl: `data:${type};base64,${Buffer.from(bytes).toString("base64")}` };
  } catch {
    return { error: "That picture did not open." };
  }
}
