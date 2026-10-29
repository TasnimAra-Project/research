import { Suspense } from "react";
import { connection } from "next/server";
import { SiteNav } from "@/components/site/SiteNav";
import { createServerSupabase } from "@/lib/supabase/server";

async function SignedInHeader() {
  await connection();
  const supabase = await createServerSupabase();
  let signedIn = false;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  return <SiteNav signedIn={signedIn} />;
}

export function SiteHeader() {
  return (
    <Suspense fallback={<SiteNav signedIn={false} />}>
      <SignedInHeader />
    </Suspense>
  );
}
