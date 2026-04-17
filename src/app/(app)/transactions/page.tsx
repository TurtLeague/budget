import { createClient } from "@/lib/supabase/server";
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

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    householdId
      ? supabase
          .from("transactions")
          .select("*, profiles(display_name, avatar_color), budget_categories(name, color, icon)")
          .eq("household_id", householdId)
          .order("date", { ascending: false })
          .limit(100)
      : { data: [] },
    householdId
      ? supabase.from("budget_categories").select("*").eq("household_id", householdId)
      : { data: [] },
  ]);

  return (
    <TransactionsClient
      initialTransactions={transactions ?? []}
      categories={categories ?? []}
      householdId={householdId}
      userId={user!.id}
    />
  );
}
