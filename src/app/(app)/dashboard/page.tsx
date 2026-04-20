import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, getPeriodStartStr, MONTH_NAMES } from "@/lib/utils";
import SpendingChartWrapper from "@/components/dashboard/SpendingChartWrapper";
import TrendChartWrapper from "@/components/dashboard/TrendChartWrapper";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, households(*)")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id ?? null;
  const now = new Date();

  // Fetch 6 months of transactions for trend chart
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fromDate = sixMonthsAgo.toISOString().split("T")[0];

  const [{ data: transactions }, { data: categories }, { data: savingsGoals }] =
    await Promise.all([
      householdId
        ? supabase.from("transactions").select("amount, type, category_id, date")
            .eq("household_id", householdId).gte("date", fromDate)
        : { data: [] },
      householdId
        ? supabase.from("budget_categories")
            .select("id, name, monthly_limit, color, icon, reset_frequency, reset_day, reset_month")
            .eq("household_id", householdId)
        : { data: [] },
      householdId
        ? supabase.from("savings_goals").select("name, target_amount, current_amount, color, icon")
            .eq("household_id", householdId).limit(3)
        : { data: [] },
    ]);

  const txs = transactions ?? [];
  const cats = categories ?? [];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMon = txs.filter(t => t.date >= monthStart);

  const income = thisMon.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = thisMon.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const monthLabel = now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

  // Spending pie chart — current period per category
  const chartData = cats
    .map(cat => {
      const spent = txs.filter(t => t.type === "expense" && t.category_id === cat.id
        && t.date >= getPeriodStartStr(cat.reset_frequency ?? "monthly", cat.reset_day ?? 1, cat.reset_month ?? 1))
        .reduce((s, t) => s + t.amount, 0);
      return { name: cat.name, value: spent, color: cat.color, icon: cat.icon };
    })
    .filter(d => d.value > 0);

  const uncategorised = txs.filter(t => t.type === "expense" && !t.category_id && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0);
  if (uncategorised > 0) chartData.push({ name: "Övrigt", value: uncategorised, color: "#9ca3af", icon: "📦" });

  // Trend data — last 6 months
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = txs.filter(t => t.date.startsWith(prefix));
    return {
      month: MONTH_NAMES[d.getMonth()].slice(0, 3),
      income: m.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expenses: m.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      <div>
        <p className="text-sm text-gray-400 dark:text-slate-500 capitalize">{monthLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Hej, {profile?.display_name ?? "där"} 👋
        </h1>
        {profile?.households && (
          <p className="text-sm text-gray-400 dark:text-slate-500">{(profile.households as { name: string }).name} ❤️</p>
        )}
      </div>

      {/* Balance card */}
      <div className="bg-green-500 rounded-2xl p-5 text-white relative overflow-hidden">
        <span className="absolute top-3 right-4 text-4xl opacity-20 select-none">❤️</span>
        <p className="text-sm font-medium text-green-100">Månadssaldo</p>
        <p className="text-4xl font-bold mt-1">{formatCurrency(balance)}</p>
        <div className="flex gap-6 mt-4">
          <div><p className="text-xs text-green-200">Inkomster</p><p className="text-lg font-semibold">+{formatCurrency(income)}</p></div>
          <div><p className="text-xs text-green-200">Utgifter</p><p className="text-lg font-semibold">-{formatCurrency(expenses)}</p></div>
        </div>
      </div>

      {!householdId && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300">
          Du är inte med i något hushåll.{" "}
          <Link href="/settings" className="font-semibold underline">Skapa eller gå med →</Link>
        </div>
      )}

      {chartData.length > 0 && <SpendingChartWrapper data={chartData} />}
      {trendData.some(d => d.income > 0 || d.expenses > 0) && <TrendChartWrapper data={trendData} />}

      {/* Budget overview */}
      {cats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-slate-200">Budget denna period</h2>
            <Link href="/budget" className="text-sm text-green-600">Se alla</Link>
          </div>
          <div className="space-y-3">
            {cats.slice(0, 4).map(cat => {
              const spent = txs.filter(t => t.type === "expense" && t.category_id === cat.id
                && t.date >= getPeriodStartStr(cat.reset_frequency ?? "monthly", cat.reset_day ?? 1, cat.reset_month ?? 1))
                .reduce((s, t) => s + t.amount, 0);
              const pct = cat.monthly_limit > 0 ? Math.min((spent / cat.monthly_limit) * 100, 100) : 0;
              const over = spent > cat.monthly_limit && cat.monthly_limit > 0;
              return (
                <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium dark:text-slate-200">{cat.icon} {cat.name}</span>
                    <span className={`text-xs ${over ? "text-red-500 font-semibold" : "text-gray-400 dark:text-slate-400"}`}>
                      {formatCurrency(spent)} / {formatCurrency(cat.monthly_limit)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(savingsGoals ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-slate-200">Sparmål</h2>
            <Link href="/savings" className="text-sm text-green-600">Se alla</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(savingsGoals ?? []).map(goal => {
              const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <div key={goal.name} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm min-w-[160px]">
                  <div className="text-2xl mb-2">{goal.icon}</div>
                  <p className="text-sm font-medium dark:text-slate-200 truncate">{goal.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </p>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Snabbåtgärder</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/transactions" className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">➕</div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Ny transaktion</p>
          </Link>
          <Link href="/savings" className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">💰</div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Uppdatera sparmål</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
