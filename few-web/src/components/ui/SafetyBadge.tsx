import type { Verdict } from "@/data/types";

const COPY: Record<Verdict, { label: string; className: string }> = {
  okay: { label: "Okay", className: "border-okay-fg bg-okay-bg text-okay-fg" },
  okay_if_prepared: { label: "Okay if prepared safely", className: "border-change-fg bg-change-bg text-change-fg" },
  limit: { label: "Limit", className: "border-limit-fg bg-limit-bg text-limit-fg" },
  avoid: { label: "Avoid", className: "border-avoid-fg bg-avoid-bg text-avoid-fg" },
  unknown: { label: "Ask your doctor", className: "border-ink bg-white text-ink" },
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 12.5 l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <path d="M14 7 a3 3 0 0 0 4 4 l-7 7 -3-3 7-7 z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 6 l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <path d="M5 16 a7 7 0 1 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16 L16 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 16 h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 7.5 l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8 v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.8" fill="currentColor" />
    </svg>
  );
}

const ICONS = {
  okay: CheckIcon,
  okay_if_prepared: WrenchIcon,
  limit: GaugeIcon,
  avoid: StopIcon,
  unknown: ReviewIcon,
};

export function SafetyBadge({ verdict, label }: { verdict: Verdict; label?: string }) {
  const copy = COPY[verdict];
  const Icon = ICONS[verdict];
  return (
    <span className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-semibold ${copy.className}`}>
      <Icon />
      <span>{label ?? copy.label}</span>
    </span>
  );
}

export function SafetyNote({
  verdict,
  label,
  change,
  reason,
  sourceName,
  sourceUrl,
}: {
  verdict: Verdict;
  label?: string;
  change?: string | null;
  reason?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
}) {
  const copy = COPY[verdict];
  const Icon = ICONS[verdict];
  const detailed = verdict === "okay_if_prepared" || verdict === "limit" || verdict === "avoid";
  if (!detailed) return <SafetyBadge verdict={verdict} label={label} />;
  return (
    <div className={`rounded-2xl border-2 px-3 py-3 text-base ${copy.className}`}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon />
        <span>{label ?? copy.label}</span>
      </p>
      {change ? <p className="mt-2">What to change: {change}</p> : null}
      {reason ? <p className="mt-2">{reason}</p> : null}
      {sourceUrl ? (
        <p className="mt-2">
          Source:{" "}
          <a className="underline" href={sourceUrl}>
            {sourceName ?? "Official source"}
          </a>
        </p>
      ) : null}
    </div>
  );
}
