import { createClient } from "@/lib/supabase/server";
import OverviewClient from "./OverviewClient";

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const householdId = profile?.household_id ?? null;

  // Fetch 13 months of data so client can navigate freely
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  const fromDate = from.toISOString().split("T")[0];

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    householdId
      ? supabase
          .from("transactions")
          .select("id, amount, type, category_id, description, date")
          .eq("household_id", householdId)
          .gte("date", fromDate)
          .order("date", { ascending: false })
      : { data: [] },
    householdId
      ? supabase.from("budget_categories").select("id, name, color, icon, monthly_limit").eq("household_id", householdId)
      : { data: [] },
  ]);

  return (
    <OverviewClient
      transactions={transactions ?? []}
      categories={categories ?? []}
      hasHousehold={!!householdId}
    />
  );
}
