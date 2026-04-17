import { createClient } from "@/lib/supabase/server";
import { getCurrentMonth } from "@/lib/utils";
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
  const month = getCurrentMonth();

  const [{ data: categories }, { data: transactions }] = await Promise.all([
    householdId
      ? supabase.from("budget_categories").select("*").eq("household_id", householdId).order("name")
      : { data: [] },
    householdId
      ? supabase
          .from("transactions")
          .select("amount, type, category_id")
          .eq("household_id", householdId)
          .eq("type", "expense")
          .gte("date", `${month}-01`)
      : { data: [] },
  ]);

  return (
    <BudgetClient
      categories={categories ?? []}
      transactions={transactions ?? []}
      householdId={householdId}
    />
  );
}
