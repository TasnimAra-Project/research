import { createServerSupabase } from "@/lib/supabase/server";
import { profileFromRow, type Profile } from "@/lib/profile/types";

export async function loadProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return profileFromRow(data as Record<string, unknown> | null);
}
