import { Decoration } from "@/components/ui/Decoration";

export function SectionDivider() {
  return (
    <div className="flex items-center justify-center py-2 text-leaf">
      <Decoration kind="vine" className="h-8 w-full max-w-xs" />
    </div>
  );
}
