type MarkProps = {
  className?: string;
};

export function ButterflyMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 88 72" className={className} fill="none">
      <g className="few-wing few-wing-left">
        <path
          d="M40 36 C28 18 8 14 10 32 C12 48 26 50 40 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M40 40 C26 48 16 62 28 64 C40 60 42 48 40 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g className="few-wing few-wing-right">
        <path
          d="M48 36 C60 18 80 14 78 32 C76 48 62 50 48 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M48 40 C62 48 72 62 60 64 C48 60 46 48 48 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M44 16 C43 28 43 40 44 58"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M44 18 C38 10 34 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M44 18 C50 10 54 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LeafMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M12 50 C18 28 34 12 54 10 C48 32 34 48 12 50 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 46 C28 38 40 26 50 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SprigMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M12 54 C24 44 36 30 50 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M28 40 C22 32 18 30 14 32 C20 36 24 40 28 40 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M38 30 C36 20 34 16 30 14 C36 20 40 26 38 30 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M46 20 C52 16 56 12 58 8 C52 14 48 18 46 20 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VineMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 280 36" className={className} fill="none">
      <path
        d="M4 22 C40 8 70 30 110 18 C150 6 180 28 220 16 C246 8 262 14 276 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M78 16 C70 8 64 8 62 14 C70 12 76 16 78 16 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M168 14 C174 6 182 6 184 12 C176 10 170 14 168 14 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
