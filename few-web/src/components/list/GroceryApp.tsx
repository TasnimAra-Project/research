"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AISLE_ORDER } from "@/data/aisles";
import { SendOptions } from "@/components/list/SendOptions";
import { Button } from "@/components/ui/Button";
import type { Food, Recipe } from "@/data/types";
import {
  collapseShoppingItems,
  formatGroceryLine,
  linesToSend,
  matchFood,
  todayISO,
  type GroceryItem,
  type PantryItem,
  type WeekRecipe,
} from "@/lib/grocery/lines";
import {
  addPantryItem,
  addRecipesToList,
  ensureShare,
  loadList,
  removeFromWeek,
  removeItem,
  removePantryItem,
  setItemGot,
} from "@/lib/grocery/store";

function groupItems(items: GroceryItem[]) {
  const groups = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const aisle = item.aisle || "Other";
    const rows = groups.get(aisle) ?? [];
    rows.push(item);
    groups.set(aisle, rows);
  }
  const known = AISLE_ORDER.filter((aisle) => groups.has(aisle));
  const extra = [...groups.keys()].filter((aisle) => !AISLE_ORDER.includes(aisle as (typeof AISLE_ORDER)[number])).sort();
  return [...known, ...extra].map((aisle) => ({
    aisle,
    items: (groups.get(aisle) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function GroceryApp({
  recipes,
  foods,
  amazonTag,
  walmartEnabled,
  instacartEnabled,
  instacartUrl,
}: {
  recipes: Recipe[];
  foods: Food[];
  amazonTag: string;
  walmartEnabled: boolean;
  instacartEnabled: boolean;
  instacartUrl: string;
}) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [week, setWeek] = useState<WeekRecipe[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pantryName, setPantryName] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const today = todayISO();
  const bySlug = useMemo(() => new Map(recipes.map((recipe) => [recipe.slug, recipe])), [recipes]);
  const shoppable = collapseShoppingItems(items);
  const groups = groupItems(shoppable);
  const preview = linesToSend(shoppable, foods, pantry, today);

  async function refresh() {
    const next = await loadList();
    setItems(next.items);
    setPantry(next.pantry);
    setWeek(next.week);
  }

  useEffect(() => {
    let active = true;
    loadList()
      .then((next) => {
        if (!active) return;
        setItems(next.items);
        setPantry(next.pantry);
        setWeek(next.week);
      })
      .catch((error: unknown) => {
        if (active) setStatus(error instanceof Error ? error.message : "The list could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setStatus(null);
    try {
      await action();
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "That change could not be saved.");
    }
  }

  async function addWeekIngredients() {
    const selected = week.map((entry) => bySlug.get(entry.recipe_slug)).filter((recipe): recipe is Recipe => Boolean(recipe));
    await run(async () => {
      const result = await addRecipesToList(selected, foods);
      const skipped = result.skipped.length > 0 ? ` ${result.skipped.join(" ")}` : "";
      setStatus(
        result.added === 0 && result.skipped.length > 0
          ? `Nothing new was added.${skipped}`
          : `Added ingredients from this week.${skipped}`,
      );
    });
  }

  async function savePantry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = pantryName.trim();
    if (!name) return;
    const food = matchFood(foods, name);
    await run(async () => {
      await addPantryItem({
        name: food?.name ?? name,
        foodSlug: food?.slug ?? null,
        purchasedOn: purchasedOn || null,
        expiresOn: expiresOn || null,
      });
      setPantryName("");
      setPurchasedOn("");
      setExpiresOn("");
      setStatus("Saved in your pantry. The list skips it until it expires.");
    });
  }

  const inviteHref = invite && typeof window !== "undefined" ? `${window.location.origin}/share/${invite}` : "";

  return (
    <main id="main" className="min-h-screen px-4 py-6 sm:px-6">
      <header className="no-print mb-6">
        <h1 className="font-display text-3xl font-bold">Grocery list</h1>
      </header>

      {status ? (
        <p role="status" className="no-print mb-4 text-base">
          {status}
        </p>
      ) : null}
      {loading ? <p className="text-base">Loading your list.</p> : null}

      <SendOptions
        lines={preview.lines}
        amazonTag={amazonTag}
        walmartEnabled={walmartEnabled}
        instacartEnabled={instacartEnabled}
        instacartUrl={instacartUrl}
      />
      {preview.skipped.length > 0 ? (
        <p className="mt-3 text-base">Left off the send because of your pantry: {preview.skipped.join(" ")}</p>
      ) : null}

      <section className="no-print mb-8 mt-8">
        <h2 className="font-display text-2xl font-bold">This week</h2>
        <p className="mt-2 text-base">
          Plan meals on the <Link href="/plan" className="underline">Week page</Link>, then choose Add ingredients. This list also keeps ingredients you add from a recipe.
        </p>
        {week.length === 0 ? (
          <p className="mt-3 text-base">No recipes on this list yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {week.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-white px-4 py-2">
                <span className="text-base">{bySlug.get(entry.recipe_slug)?.title ?? entry.recipe_slug}</span>
                <Button variant="quiet" onClick={() => run(() => removeFromWeek(entry.id))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3" onClick={addWeekIngredients} disabled={week.length === 0}>
          Add all ingredients
        </Button>
      </section>

      <section className="no-print mb-8">
        <h2 className="font-display text-2xl font-bold">Pantry</h2>
        <p className="mt-2 text-base">The list skips a food you still have. An expired food is not skipped.</p>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={savePantry}>
          <div className="flex flex-col gap-2">
            <label htmlFor="pantry-name" className="text-base font-semibold">
              Food
            </label>
            <input
              id="pantry-name"
              list="pantry-foods"
              value={pantryName}
              onChange={(event) => setPantryName(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
            />
            <datalist id="pantry-foods">
              {foods.map((food) => (
                <option key={food.slug} value={food.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="purchased-on" className="text-base font-semibold">
              Purchased
            </label>
            <input
              id="purchased-on"
              type="date"
              value={purchasedOn}
              onChange={(event) => setPurchasedOn(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="expires-on" className="text-base font-semibold">
              Expires
            </label>
            <input
              id="expires-on"
              type="date"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
              className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Save in pantry</Button>
          </div>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {pantry.map((item) => {
            const expired = Boolean(item.expires_on && item.expires_on < today);
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-white px-4 py-2">
                <span className="text-base">
                  {item.name}
                  {item.purchased_on ? `, purchased ${item.purchased_on}` : ""}
                  {item.expires_on ? `, expires ${item.expires_on}` : ", no expiry date"}
                  {expired ? ", expired" : ""}
                </span>
                <Button variant="quiet" onClick={() => run(() => removePantryItem(item.id))}>
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">My shopping list</h2>
        <p className="mt-2 text-base">Tick an item when you have it. What is left is what you still need to buy.</p>
        {items.length === 0 ? (
          <p className="mt-3 text-base">Nothing here yet. Add all ingredients from a recipe or from this week.</p>
        ) : (
          groups.map((group) => (
            <section key={group.aisle} className="mt-4">
              <h3 className="font-display text-xl font-bold">{group.aisle}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.id} className="rounded-[18px] bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex min-h-11 items-center gap-3 text-base">
                        <input
                          className="h-5 w-5 accent-ink"
                          type="checkbox"
                          checked={item.got}
                          aria-label={`Got ${formatGroceryLine(item)}`}
                          onChange={(event) => {
                            const got = event.target.checked;
                            setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, got } : row)));
                            void run(() => setItemGot(item.id, got));
                          }}
                        />
                        <span className={item.got ? "line-through" : undefined}>{formatGroceryLine(item)}</span>
                      </label>
                      <Button variant="quiet" className="no-print" onClick={() => run(() => removeItem(item.id))}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      <section className="no-print mt-8 rounded-[20px] bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Share with a partner</h2>
        <p className="mt-2 text-base">The invite shows this week and the shopping list. It does not show pantry dates.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              run(async () => {
                const token = await ensureShare(false);
                setInvite(token);
              })
            }
          >
            Create invite link
          </Button>
          {invite ? (
            <Button
              variant="secondary"
              onClick={() =>
                run(async () => {
                  const token = await ensureShare(true);
                  setInvite(token);
                  setStatus("The old invite link no longer works.");
                })
              }
            >
              Make a new link
            </Button>
          ) : null}
        </div>
        {inviteHref ? (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="invite-link" className="text-base font-semibold">
              Invite link
            </label>
            <input id="invite-link" readOnly value={inviteHref} className="min-h-11 rounded-2xl border-2 border-rose bg-blush px-4 text-base" />
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteHref);
                setStatus("Invite link copied.");
              }}
            >
              Copy invite link
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
