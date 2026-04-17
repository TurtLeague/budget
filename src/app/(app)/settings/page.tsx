import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, households(*)")
    .eq("id", user!.id)
    .single();

  let partner = null;
  if (profile?.household_id) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_color")
      .eq("household_id", profile.household_id)
      .neq("id", user!.id)
      .single();
    partner = data;
  }

  return (
    <SettingsClient
      profile={profile}
      household={profile?.households ?? null}
      partner={partner}
      userEmail={user!.email ?? ""}
    />
  );
}
