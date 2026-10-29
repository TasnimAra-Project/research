"use client";

import { useEffect, useState } from "react";
import { SafetyNote } from "@/components/ui/SafetyBadge";
import { Button } from "@/components/ui/Button";
import { UnverifiedNote } from "@/components/eat/UnverifiedNote";
import type { Food } from "@/data/types";
import { readPictureText } from "@/lib/safety/ocr";
import { recipeFromPicture } from "@/lib/safety/picture";
import { reviewFoods, reviewRecipePage, type ReviewedFood } from "@/app/eat/review";

function FoodLine({ item }: { item: ReviewedFood }) {
  return (
    <li className="rounded-2xl bg-blush px-3 py-3">
      <p className="text-base font-semibold">{item.name}</p>
      <div className="mt-2">
        {item.verdict && item.verdict !== "unknown" ? (
          <SafetyNote
            verdict={item.verdict}
            change={item.safeVersion}
            reason={item.reason}
            sourceName={item.sourceName}
            sourceUrl={item.sourceUrl}
          />
        ) : (
          <UnverifiedNote guides={item.guides} />
        )}
      </div>
    </li>
  );
}

export function EatChecker({ foods, initialLink = "" }: { foods: Food[]; initialLink?: string }) {
  const [link, setLink] = useState(initialLink);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewedFood[] | null>(null);

  function showItems(next: ReviewedFood[], heading: string | null, name: string | null, url: string | null) {
    setTitle(heading);
    setSourceName(name);
    setSourceUrl(url);
    setItems(next);
    setStatus(next.length === 0 ? "No foods could be read." : null);
  }

  async function checkLink(raw: string) {
    const url = raw.trim();
    if (!url) {
      setStatus("Paste a recipe link.");
      return;
    }
    setPending(true);
    setStatus("Checking the verified list.");
    setItems(null);
    try {
      const result = await reviewRecipePage(url);
      if ("error" in result) {
        setStatus(result.error);
        return;
      }
      showItems(result.items, result.title, result.sourceName, result.sourceUrl);
    } catch {
      setStatus("The check did not finish. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function checkPicture(file: File) {
    setPending(true);
    setStatus("Reading the picture.");
    setItems(null);
    try {
      const text = await readPictureText(file);
      const recipe = recipeFromPicture(text, foods);
      const names = recipe.ingredients.map((line) => line.item);
      if (names.length === 0) {
        setStatus("No foods could be read from that picture.");
        return;
      }
      setStatus("Checking the verified list.");
      const reviewed = await reviewFoods(names);
      showItems(reviewed, recipe.title, "a picture", null);
    } catch {
      setStatus("That picture could not be read. Try a clearer photo.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!initialLink) return;
    const timer = window.setTimeout(() => {
      void checkLink(initialLink);
    }, 0);
    return () => window.clearTimeout(timer);
    // A shared recipe link is checked once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-8 max-w-2xl rounded-[20px] bg-white p-4">
      <h2 className="font-display text-2xl font-bold">Check a recipe</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-rose px-5 text-base font-semibold">
          Take a photo
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void checkPicture(file);
            }}
          />
        </label>
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-rose bg-white px-5 text-base font-semibold">
          Choose a picture
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void checkPicture(file);
            }}
          />
        </label>
      </div>
      <div
        className="mt-3 flex min-h-16 items-center justify-center rounded-[18px] border-2 border-dashed border-rose px-4 text-center text-base"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (!file || !file.type.startsWith("image/")) {
            setStatus("Drop a picture of the recipe or package.");
            return;
          }
          void checkPicture(file);
        }}
      >
        Or drop a picture here
      </div>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void checkLink(link);
        }}
      >
        <label htmlFor="recipe-link" className="text-base font-semibold">
          Recipe link
        </label>
        <input
          id="recipe-link"
          type="url"
          value={link}
          placeholder="https://"
          onChange={(event) => setLink(event.target.value)}
          className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Checking" : "Check"}
        </Button>
      </form>
      {status ? (
        <p role="status" className="mt-4 text-base">
          {status}
        </p>
      ) : null}
      {items && items.length > 0 ? (
        <div className="mt-4">
          {title ? <h3 className="font-display text-2xl font-bold">{title}</h3> : null}
          {sourceName ? (
            <p className="mt-1 text-base">
              {sourceUrl ? (
                <a className="underline" href={sourceUrl}>
                  {sourceName}
                </a>
              ) : (
                sourceName
              )}
            </p>
          ) : null}
          <ul className="mt-3 space-y-3">
            {items.map((item, index) => (
              <FoodLine key={`${item.name}-${index}`} item={item} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
