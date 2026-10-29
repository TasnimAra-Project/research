import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
};

const VARIANTS = {
  primary: "bg-rose text-ink hover:brightness-95",
  secondary: "border-2 border-rose bg-white text-ink hover:bg-blush-deep",
  quiet: "bg-transparent text-ink underline-offset-4 hover:underline",
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-base font-semibold ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
