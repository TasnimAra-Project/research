export function NutrientChip({ children }: { children: string }) {
  return (
    <span className="inline-flex min-h-11 items-center rounded-full bg-leaf-soft px-3 py-1 text-base text-ink">
      {children}
    </span>
  );
}
