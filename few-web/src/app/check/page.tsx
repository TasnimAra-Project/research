import { connection } from "next/server";
import { redirect } from "next/navigation";

export default async function CheckRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const suffix = query.toString();
  redirect(suffix ? `/eat?${suffix}` : "/eat");
}
