import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function TextField({ id, label, hint, className = "", ...props }: TextFieldProps) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={`min-h-11 rounded-2xl border-2 border-ink/20 bg-white px-4 text-base text-ink ${className}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-base text-ink">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
