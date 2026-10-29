import { ButterflyMark, LeafMark, SprigMark, VineMark } from "@/components/decorations/marks";

const MARKS = {
  butterfly: ButterflyMark,
  leaf: LeafMark,
  sprig: SprigMark,
  vine: VineMark,
} as const;

export type DecorationKind = keyof typeof MARKS;

type DecorationProps = {
  kind: DecorationKind;
  flutter?: boolean;
  className?: string;
};

export function Decoration({ kind, flutter = false, className }: DecorationProps) {
  const Mark = MARKS[kind];
  return (
    <span aria-hidden="true" className={flutter ? "few-flutter inline-flex" : "inline-flex"}>
      <Mark className={className} />
    </span>
  );
}
