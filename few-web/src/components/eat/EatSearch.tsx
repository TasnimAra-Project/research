"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Food } from "@/data/types";
import { normalizeName } from "@/lib/grocery/lines";

export function EatSearch({ foods, compact = false }: { foods: Food[]; compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const needle = normalizeName(query);
  const matches = useMemo(() => {
    if (needle.length < 2) return [];
    return foods
      .filter((food) => {
        const names = [food.name, food.slug.replace(/-/g, " "), ...food.aliases].map(normalizeName);
        return names.some((name) => name.includes(needle));
      })
      .slice(0, 8);
  }, [foods, needle]);
  const exact = matches.some((food) => {
    const names = [food.name, ...food.aliases].map(normalizeName);
    return names.includes(needle);
  });
  const showUnchecked = needle.length >= 2 && !exact;

  return (
    <div className={compact ? "relative" : "relative"}>
      <label htmlFor={compact ? "eat-search-compact" : "eat-search"} className="mb-2 block text-base font-semibold">
        Food
      </label>
      <input
        id={compact ? "eat-search-compact" : "eat-search"}
        type="search"
        value={query}
        placeholder="Type a food"
        autoComplete="off"
        role="combobox"
        aria-expanded={matches.length > 0 || showUnchecked}
        aria-controls="eat-suggestions"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && showUnchecked) {
            event.preventDefault();
            router.push(`/eat?q=${encodeURIComponent(query.trim())}`);
          }
        }}
        className="min-h-11 w-full rounded-full border-2 border-rose bg-white px-4 text-base text-ink"
      />
      {matches.length > 0 || showUnchecked ? (
        <ul id="eat-suggestions" role="listbox" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-2xl border-2 border-rose bg-white p-2">
          {matches.map((food) => (
            <li key={food.slug}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="min-h-11 w-full rounded-xl px-3 text-left text-base"
                onClick={() => {
                  setQuery("");
                  router.push(`/eat?food=${food.slug}`);
                }}
              >
                {food.name}
              </button>
            </li>
          ))}
          {showUnchecked ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="min-h-11 w-full rounded-xl px-3 text-left text-base"
                onClick={() => {
                  const typed = query.trim();
                  setQuery("");
                  router.push(`/eat?q=${encodeURIComponent(typed)}`);
                }}
              >
                Check {query.trim()}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
