import { Decoration } from "@/components/ui/Decoration";

export function ButterflyLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-6">
      <Decoration kind="butterfly" flutter className="h-16 w-20 text-sky" />
      <p className="text-base text-ink">{label}</p>
    </div>
  );
}
