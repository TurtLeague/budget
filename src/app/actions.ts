"use server";
import { createClient } from "@/lib/supabase/server";
import { isRecurringDue } from "@/lib/utils";
import type { RecurringTransaction } from "@/lib/types";

export async function applyDueRecurringTransactions(householdId: string, userId: string) {
  const supabase = await createClient();

  const { data: recurring } = await supabase
    .from("recurring_transactions")
    .select("*, budget_categories(name,color,icon)")
    .eq("household_id", householdId)
    .eq("active", true);

  if (!recurring?.length) return;

  const today = new Date().toISOString().split("T")[0];

  for (const r of recurring as RecurringTransaction[]) {
    if (!isRecurringDue(r)) continue;

    await supabase.from("transactions").insert({
      household_id: householdId,
      created_by: userId,
      category_id: r.category_id,
      amount: r.amount,
      type: r.type,
      description: r.description,
      date: today,
      recurring_id: r.id,
    });

    await supabase
      .from("recurring_transactions")
      .update({ last_applied: today })
      .eq("id", r.id);
  }
}
