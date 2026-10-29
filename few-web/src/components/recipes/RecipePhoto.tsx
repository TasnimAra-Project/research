"use client";

import { useState } from "react";

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function RecipePhoto({
  slug,
  photoUrl,
  className = "",
}: {
  slug: string;
  photoUrl: string | null;
  className?: string;
}) {
  const sources = [photoUrl, ...EXTENSIONS.map((extension) => `/recipes/${slug}${extension}`)].filter(
    (source): source is string => Boolean(source),
  );
  const [index, setIndex] = useState(0);

  if (index >= sources.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-[16px] bg-blush-deep text-base text-ink">
        Photo coming
      </div>
    );
  }

  return (
    // Local recipe files are optional until a photo is added, so a plain img can fall through extensions.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[index]}
      alt=""
      className={className}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
