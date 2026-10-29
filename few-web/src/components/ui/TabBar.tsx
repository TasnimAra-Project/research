"use client";

import { useState } from "react";

const TABS = [
  { id: "home", label: "Home" },
  { id: "recipes", label: "Recipes" },
  { id: "planner", label: "Planner" },
  { id: "list", label: "List" },
  { id: "safety", label: "Can I eat this?" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabIcon({ id }: { id: TabId }) {
  const common = { viewBox: "0 0 24 24", className: "h-6 w-6", fill: "none", "aria-hidden": true as const };
  if (id === "home") {
    return (
      <svg {...common}>
        <path d="M4 11 L12 5 L20 11 V19 H4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "recipes") {
    return (
      <svg {...common}>
        <path d="M7 4 h10 v16 H7 Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 8 h4 M10 12 h4 M10 16 h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "planner") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 4 v4 M16 4 v4 M4 10 h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "list") {
    return (
      <svg {...common}>
        <path d="M8 7 h11 M8 12 h11 M8 17 h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 7 h1 M4 12 h1 M4 17 h1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 10 a2.5 2.5 0 1 1 3.2 2.4 c-.8.4-1.2.8-1.2 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function TabBar() {
  const [current, setCurrent] = useState<TabId>("home");

  return (
    <nav aria-label="Primary" className="grid grid-cols-5 border-t border-ink/15 bg-cream">
      {TABS.map((tab) => {
        const selected = current === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => setCurrent(tab.id)}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-2 text-base leading-tight text-ink ${selected ? "font-bold" : "font-semibold"}`}
          >
            <TabIcon id={tab.id} />
            <span className={`max-w-full text-center ${selected ? "underline decoration-2 underline-offset-4" : ""}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
