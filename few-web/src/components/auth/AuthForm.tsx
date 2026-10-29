"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Accounts are not connected yet. Start the local database, then try again.");
      return;
    }

    setPending(true);
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setPending(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "create" && !result.data.session) {
      setError("Check your email to finish creating the account, then log in.");
      return;
    }

    router.push(mode === "create" ? "/welcome" : "/recipes");
    router.refresh();
  }

  const creating = mode === "create";

  return (
    <div className="w-full max-w-md rounded-[20px] bg-white px-6 py-8 shadow-sm">
      <h1 className="font-display text-4xl font-bold text-ink">Families Eat Well</h1>
      <p className="mt-4 text-base text-ink">
        Recipes and meal ideas for pregnant and breastfeeding women who are working and keeping an eye on cost. Every recipe shows the time, the price, and why it helps you and your baby. A food safety verdict appears only when a source states one.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-base font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-base font-semibold">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base text-ink"
          />
        </div>
        {error ? (
          <p role="alert" className="text-base text-ink">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait" : creating ? "Create account" : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-base">
        {creating ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          className="min-h-11 font-semibold underline decoration-2 underline-offset-4"
          onClick={() => {
            setMode(creating ? "login" : "create");
            setError(null);
          }}
        >
          {creating ? "Log in" : "Create account"}
        </button>
      </p>
    </div>
  );
}
