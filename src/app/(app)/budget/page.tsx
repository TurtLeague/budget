import { createClient } from "@/lib/supabase/server";
import BudgetClient from "./BudgetClient";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const householdId = profile?.household_id ?? null;

  // Fetch 13 months of expense transactions for surplus calculation
  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
  const fromDate = thirteenMonthsAgo.toISOString().split("T")[0];

  const [{ data: categories }, { data: allTransactions }] = await Promise.all([
    householdId
      ? supabase.from("budget_categories").select("*").eq("household_id", householdId).order("name")
      : { data: [] },
    householdId
      ? supabase
          .from("transactions")
          .select("amount, type, category_id, date")
          .eq("household_id", householdId)
          .eq("type", "expense")
          .gte("date", fromDate)
      : { data: [] },
  ]);

  return (
    <BudgetClient
      categories={categories ?? []}
      allTransactions={allTransactions ?? []}
      householdId={householdId}
    />
  );
}
