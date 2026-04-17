import { createClient } from "@/lib/supabase/server";
import { applyDueRecurringTransactions } from "@/app/actions";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const householdId = profile?.household_id ?? null;

  // Apply any due recurring transactions on each visit
  if (householdId) {
    await applyDueRecurringTransactions(householdId, user!.id);
  }

  const [{ data: transactions }, { data: categories }, { data: recurring }] = await Promise.all([
    householdId
      ? supabase
          .from("transactions")
          .select("*, profiles(display_name, avatar_color), budget_categories(name, color, icon)")
          .eq("household_id", householdId)
          .order("date", { ascending: false })
          .limit(500)
      : { data: [] },
    householdId
      ? supabase.from("budget_categories").select("*").eq("household_id", householdId).order("name")
      : { data: [] },
    householdId
      ? supabase
          .from("recurring_transactions")
          .select("*, budget_categories(name, color, icon)")
          .eq("household_id", householdId)
          .order("created_at", { ascending: false })
      : { data: [] },
  ]);

  return (
    <TransactionsClient
      initialTransactions={transactions ?? []}
      categories={categories ?? []}
      initialRecurring={recurring ?? []}
      householdId={householdId}
      userId={user!.id}
    />
  );
}
