import { createBrowserSupabase } from "@/lib/supabase/client";
import { profileToRow, type Profile } from "@/lib/profile/types";

export async function saveProfile(profile: Profile) {
  const supabase = createBrowserSupabase();
  if (!supabase) return "Accounts are not connected yet. Start the local database, then try again.";
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return "Log in to save settings.";
  const { data: saved, error } = await supabase.from("profiles").update(profileToRow(profile)).eq("id", data.user.id).select("id");
  if (error) return error.message;
  if (!saved?.length) return "Your settings could not be saved.";
  return null;
}
