import type { ReactNode } from "react";
import { Decoration } from "@/components/ui/Decoration";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative rounded-[18px] border-2 border-dashed border-ink/20 bg-saffron-soft px-6 pt-8 pb-16 text-center">
      <Decoration kind="butterfly" flutter className="mx-auto mb-3 h-16 w-20 text-berry" />
      <h3 className="font-display text-2xl font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-base text-ink">{children}</p>
      <Decoration kind="sprig" className="absolute bottom-3 left-3 h-10 w-10 text-leaf" />
    </div>
  );
}
