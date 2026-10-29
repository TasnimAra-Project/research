"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Decoration } from "@/components/ui/Decoration";
import { createBrowserSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/plan", label: "Week" },
  { href: "/eat", label: "Can I eat this" },
  { href: "/list", label: "Grocery list" },
];

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logOut() {
    const supabase = createBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="no-print z-30 shrink-0 border-b-2 border-rose bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="inline-flex min-h-12 w-fit shrink-0 items-center gap-2 rounded-full bg-blush-deep px-3 py-1 ring-2 ring-rose">
          <Decoration kind="butterfly" flutter className="h-8 w-11 text-berry" />
          <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Families Eat Well</span>
        </Link>
        <nav className="flex items-center justify-start gap-2 overflow-x-auto sm:justify-end" aria-label="Pages">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-12 items-center whitespace-nowrap rounded-full px-4 text-lg font-semibold ${
                  active ? "bg-rose text-ink" : "border-2 border-rose bg-white text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {signedIn ? (
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={`inline-flex min-h-12 items-center whitespace-nowrap rounded-full px-4 text-lg font-semibold ${
                pathname === "/settings" ? "bg-rose text-ink" : "border-2 border-rose bg-white text-ink"
              }`}
            >
              Settings
            </Link>
          ) : null}
          {signedIn ? (
            <button
              type="button"
              onClick={logOut}
              className="inline-flex min-h-12 items-center whitespace-nowrap rounded-full border-2 border-rose bg-white px-4 text-lg font-semibold"
            >
              Log out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
