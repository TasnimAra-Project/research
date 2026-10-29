import { Suspense } from "react";
import { connection } from "next/server";
import { EatSearch } from "@/components/eat/EatSearch";
import { EatChecker } from "@/components/eat/EatChecker";
import { BarcodeScan } from "@/components/eat/BarcodeScan";
import { FoodAnswer } from "@/components/eat/FoodAnswer";
import { UnverifiedNote } from "@/components/eat/UnverifiedNote";
import { seedData } from "@/data";
import { guidesForName } from "@/lib/safety/guides";

function firstLink(value: string | undefined) {
  if (!value) return "";
  const found = value
    .split(/\s+/)
    .map((part) => part.trim())
    .find((part) => part.startsWith("http"));
  return found ?? "";
}

function UncheckedFood({ name }: { name: string }) {
  return (
    <article className="rounded-[20px] bg-white p-5">
      <h2 className="font-display text-4xl font-bold">{name}</h2>
      <div className="mt-4">
        <UnverifiedNote guides={guidesForName(name)} />
      </div>
    </article>
  );
}

async function EatGate({
  food,
  query,
  link,
}: {
  food: string | null;
  query: string | null;
  link: string;
}) {
  await connection();
  const match = food ? seedData.foods.find((item) => item.slug === food) : null;
  const typed = query?.trim() ?? "";

  return (
    <main id="main" className="min-h-full px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Can I eat this?</h1>
      <p className="mt-2 text-base">Type a food, or check a package or a recipe.</p>
      <div className="mt-4 max-w-xl">
        <EatSearch foods={seedData.foods} />
      </div>
      <div className="mt-6 max-w-2xl">
        {match ? (
          <FoodAnswer food={match} foods={seedData.foods} recipes={seedData.recipes} />
        ) : typed ? (
          <UncheckedFood name={typed} />
        ) : (
          <p className="text-base">Try eggs, salmon, or milk.</p>
        )}
      </div>
      <EatChecker foods={seedData.foods} initialLink={link} />
      <BarcodeScan />
    </main>
  );
}

export default function EatPage({
  searchParams,
}: {
  searchParams: Promise<{ food?: string; q?: string; url?: string; text?: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blush" />}>
      <EatFrame searchParams={searchParams} />
    </Suspense>
  );
}

async function EatFrame({
  searchParams,
}: {
  searchParams: Promise<{ food?: string; q?: string; url?: string; text?: string }>;
}) {
  const params = await searchParams;
  const url = typeof params.url === "string" ? params.url : "";
  const text = typeof params.text === "string" ? params.text : "";
  return (
    <EatGate
      food={typeof params.food === "string" ? params.food : null}
      query={typeof params.q === "string" ? params.q : null}
      link={url || firstLink(text)}
    />
  );
}
