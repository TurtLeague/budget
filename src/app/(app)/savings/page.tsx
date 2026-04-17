import { createClient } from "@/lib/supabase/server";
import SavingsClient from "./SavingsClient";

export default async function SavingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const householdId = profile?.household_id ?? null;

  const { data: goals } = householdId
    ? await supabase.from("savings_goals").select("*").eq("household_id", householdId).order("created_at")
    : { data: [] };

  return <SavingsClient initialGoals={goals ?? []} householdId={householdId} />;
}
