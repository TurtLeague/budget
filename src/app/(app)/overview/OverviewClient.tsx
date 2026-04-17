"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";

const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

interface Tx {
  id: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  description: string;
  date: string;
}
interface Cat {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number;
}
interface Props {
  transactions: Tx[];
  categories: Cat[];
  hasHousehold: boolean;
}

const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
const FALLBACK_COLORS = ["#6366f1","#f59e0b","#22c55e","#ef4444","#3b82f6","#ec4899","#14b8a6","#8b5cf6","#f97316","#06b6d4"];

export default function OverviewClient({ transactions, categories, hasHousehold }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthTxs = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }), [transactions, year, month]);

  const totalIncome = useMemo(() => monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const totalExpense = useMemo(() => monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, { name: string; color: string; icon: string; amount: number }> = {};
    monthTxs.filter(t => t.type === "expense").forEach(t => {
      const key = t.category_id ?? "__none__";
      const cat = t.category_id ? catMap[t.category_id] : null;
      if (!map[key]) map[key] = { name: cat?.name ?? "Övrigt", color: cat?.color ?? "#9ca3af", icon: cat?.icon ?? "📦", amount: 0 };
      map[key].amount += t.amount;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [monthTxs, catMap]);

  const incomeBySource = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {};
    monthTxs.filter(t => t.type === "income").forEach(t => {
      const key = t.description || "Inkomst";
      if (!map[key]) map[key] = { name: key, amount: 0 };
      map[key].amount += t.amount;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [monthTxs]);

  const dailyData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: { day: number; income: number; expense: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d, income: 0, expense: 0 });
    monthTxs.forEach(t => {
      const d = new Date(t.date).getDate();
      if (t.type === "income") arr[d - 1].income += t.amount;
      else arr[d - 1].expense += t.amount;
    });
    return arr;
  }, [monthTxs, year, month]);

  const topExpenses = useMemo(() =>
    monthTxs.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5),
    [monthTxs]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-slate-100">Översikt</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-lg">‹</button>
          <span className="text-sm font-medium dark:text-slate-200 min-w-[100px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-lg transition-opacity ${isCurrentMonth ? "opacity-30 cursor-default" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}>›</button>
        </div>
      </div>

      {!hasHousehold && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300">
          Gå med i ett hushåll för att se din översikt.
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Saldo</p>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(balance)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Sparkvot</p>
          <p className={`text-xl font-bold ${savingsRate >= 0 ? "text-green-500" : "text-red-500"}`}>{savingsRate}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Inkomster</p>
          <p className="text-xl font-bold text-green-500">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Utgifter</p>
          <p className="text-xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Expense donut */}
      {expenseByCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-sm mb-4 dark:text-slate-200">Utgifter per kategori</h2>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {expenseByCategory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="dark:text-slate-300">{entry.icon} {entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{totalExpense > 0 ? Math.round((entry.amount / totalExpense) * 100) : 0}%</span>
                    <span className="font-medium dark:text-slate-200">{formatCurrency(entry.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Income donut */}
      {incomeBySource.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-sm mb-4 dark:text-slate-200">Inkomster per källa</h2>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={incomeBySource} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {incomeBySource.map((_, i) => (
                    <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {incomeBySource.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
                    <span className="dark:text-slate-300 truncate max-w-[160px]">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{totalIncome > 0 ? Math.round((entry.amount / totalIncome) * 100) : 0}%</span>
                    <span className="font-medium dark:text-slate-200">{formatCurrency(entry.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily bar chart */}
      {monthTxs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-sm mb-4 dark:text-slate-200">Daglig aktivitet</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData} barSize={6} barGap={1}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis hide />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name === "income" ? "Inkomst" : "Utgift"]}
                labelFormatter={(d: number) => `Dag ${d}`}
              />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Utgift</span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Inkomst</span>
          </div>
        </div>
      )}

      {/* Top expenses */}
      {topExpenses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-sm mb-4 dark:text-slate-200">Största utgifter</h2>
          <div className="space-y-3">
            {topExpenses.map((t, i) => {
              const cat = t.category_id ? catMap[t.category_id] : null;
              return (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-slate-400">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium dark:text-slate-200">{t.description || "Utan beskrivning"}</p>
                      {cat && <p className="text-xs text-gray-400 dark:text-slate-400">{cat.icon} {cat.name}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-500">-{formatCurrency(t.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {monthTxs.length === 0 && hasHousehold && (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Inga transaktioner denna månad</p>
        </div>
      )}
    </div>
  );
}
