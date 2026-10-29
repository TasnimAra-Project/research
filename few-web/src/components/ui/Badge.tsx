import type { ReactNode } from "react";

type BadgeKind = "time" | "cost" | "meal" | "diet" | "effort" | "stage";

const KIND_CLASS: Record<BadgeKind, string> = {
  time: "bg-sky-soft",
  cost: "bg-saffron-soft",
  meal: "bg-lavender-soft",
  diet: "bg-leaf-soft",
  effort: "bg-berry-soft",
  stage: "bg-cream border border-ink/15",
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8 v5 l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7 v10 M9.5 9.5 h4 a2 2 0 0 1 0 4 h-3 a2 2 0 0 0 0 4 h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-base text-ink ${KIND_CLASS[kind]}`}>
      {kind === "time" ? <ClockIcon /> : null}
      {kind === "cost" ? <CoinIcon /> : null}
      <span>{children}</span>
    </span>
  );
}
