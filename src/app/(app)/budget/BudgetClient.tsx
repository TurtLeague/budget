"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, getPeriodStartStr, MONTH_NAMES } from "@/lib/utils";
import type { BudgetCategory } from "@/lib/types";

interface Tx { amount: number; type: string; category_id: string | null; date: string; }

interface Props {
  categories: BudgetCategory[];
  allTransactions: Tx[];
  householdId: string | null;
}

const COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];
const ICONS_LIST = ["🛒", "🚗", "🍔", "🏠", "👕", "💊", "🎮", "✈️", "☕", "📱", "🎁", "💼", "🐾", "🎓", "⚡", "🔧"];

function getPeriodTransactions(cat: BudgetCategory, txs: Tx[]) {
  const start = getPeriodStartStr(cat.reset_frequency, cat.reset_day, cat.reset_month);
  return txs.filter(t => t.category_id === cat.id && t.date >= start);
}

// Calculate monthly surplus history for a category (last 12 complete months)
function getSurplusHistory(cat: BudgetCategory, txs: Tx[]) {
  const history: { label: string; limit: number; spent: number; surplus: number }[] = [];
  const today = new Date();

  for (let i = 12; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    let periodStart: string;
    let periodEnd: string;

    if (cat.reset_frequency === "monthly") {
      const startDay = cat.reset_day;
      periodStart = `${year}-${String(month + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
      const endDate = new Date(year, month + 1, startDay);
      periodEnd = endDate.toISOString().split("T")[0];
    } else {
      // yearly — only show if we have a full year
      if (i > 1) continue;
      const startYear = today.getFullYear() - 1;
      periodStart = `${startYear}-${String(cat.reset_month).padStart(2, "0")}-${String(cat.reset_day).padStart(2, "0")}`;
      const endDate = new Date(today.getFullYear(), cat.reset_month - 1, cat.reset_day);
      periodEnd = endDate.toISOString().split("T")[0];
    }

    const spent = txs
      .filter(t => t.category_id === cat.id && t.date >= periodStart && t.date < periodEnd)
      .reduce((s, t) => s + t.amount, 0);

    const surplus = cat.monthly_limit - spent;
    history.push({
      label: `${MONTH_NAMES[month].slice(0, 3)} ${year}`,
      limit: cat.monthly_limit,
      spent,
      surplus,
    });
  }

  return history;
}

export default function BudgetClient({ categories: initial, allTransactions, householdId }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [tab, setTab] = useState<"categories" | "surplus">("categories");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", monthly_limit: "", color: COLORS[0], icon: ICONS_LIST[0],
    reset_frequency: "monthly" as "monthly" | "yearly",
    reset_day: 1, reset_month: 1,
  });
  const [saving, setSaving] = useState(false);

  const totalLimit = categories.reduce((s, c) => s + c.monthly_limit, 0);
  const totalSpent = categories.reduce((s, cat) => {
    return s + getPeriodTransactions(cat, allTransactions).reduce((a, t) => a + t.amount, 0);
  }, 0);

  // Total accumulated surplus across all monthly categories, last 12 months
  const totalAccumulatedSurplus = categories
    .filter(c => c.reset_frequency === "monthly")
    .reduce((total, cat) => {
      const history = getSurplusHistory(cat, allTransactions);
      return total + history.filter(h => h.surplus > 0).reduce((s, h) => s + h.surplus, 0);
    }, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        household_id: householdId, name: form.name, monthly_limit: parseFloat(form.monthly_limit),
        color: form.color, icon: form.icon, reset_frequency: form.reset_frequency,
        reset_day: form.reset_day, reset_month: form.reset_month,
      })
      .select().single();
    if (!error && data) {
      setCategories(prev => [...prev, data as BudgetCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setShowModal(false);
      setForm({ name: "", monthly_limit: "", color: COLORS[0], icon: ICONS_LIST[0], reset_frequency: "monthly", reset_day: 1, reset_month: 1 });
    }
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("budget_categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
    router.refresh();
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        {householdId && tab === "categories" && (
          <button onClick={() => setShowModal(true)}
            className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">+</button>
        )}
      </div>

      {!householdId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-4">
          Gå med i ett hushåll först.{" "}
          <Link href="/settings" className="font-semibold underline">Inställningar →</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
        <button onClick={() => setTab("categories")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "categories" ? "bg-green-500 text-white" : "text-gray-500"}`}>
          Kategorier
        </button>
        <button onClick={() => setTab("surplus")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "surplus" ? "bg-green-500 text-white" : "text-gray-500"}`}>
          Historik & Överskott
        </button>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 flex justify-between">
            <div>
              <p className="text-xs text-gray-400">Spenderat</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Budget</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(totalLimit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Kvar</p>
              <p className={`text-xl font-bold ${totalLimit - totalSpent >= 0 ? "text-green-600" : "text-red-500"}`}>
                {formatCurrency(totalLimit - totalSpent)}
              </p>
            </div>
          </div>

          {totalLimit > 0 && (
            <div className="mb-5">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%`, backgroundColor: totalSpent > totalLimit ? "#ef4444" : "#22c55e" }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round((totalSpent / totalLimit) * 100)}% av total budget använd</p>
            </div>
          )}

          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <p>Inga budgetkategorier ännu</p>
              </div>
            ) : (
              categories.map(cat => {
                const catTxs = getPeriodTransactions(cat, allTransactions);
                const spent = catTxs.reduce((s, t) => s + t.amount, 0);
                const pct = cat.monthly_limit > 0 ? (spent / cat.monthly_limit) * 100 : 0;
                const over = spent > cat.monthly_limit;
                const resetLabel = cat.reset_frequency === "monthly"
                  ? `Återställs dag ${cat.reset_day} varje månad`
                  : `Återställs ${cat.reset_day} ${MONTH_NAMES[cat.reset_month - 1]} varje år`;
                return (
                  <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        {over && <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">Över budget</span>}
                      </div>
                      <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-400">Ta bort</button>
                    </div>
                    <p className="text-xs text-gray-300 mb-2">{resetLabel}</p>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>{formatCurrency(spent)} spenderat</span>
                      <span>{formatCurrency(cat.monthly_limit)} budget</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? "#ef4444" : cat.color }} />
                    </div>
                    {over && (
                      <p className="text-xs text-red-500 mt-1">{formatCurrency(spent - cat.monthly_limit)} över budget</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── SURPLUS TAB ── */}
      {tab === "surplus" && (
        <div className="space-y-5">
          {/* Total accumulated surplus */}
          <div className="bg-green-500 rounded-2xl p-5 text-white">
            <p className="text-sm text-green-100">Totalt sparat i budgetöverskott</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalAccumulatedSurplus)}</p>
            <p className="text-xs text-green-200 mt-1">Summan av alla månader du spenderat under budget (senaste 12 mån)</p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Skapa budgetkategorier för att se historik</p>
            </div>
          ) : (
            categories.filter(c => c.reset_frequency === "monthly").map(cat => {
              const history = getSurplusHistory(cat, allTransactions);
              const catSurplus = history.filter(h => h.surplus > 0).reduce((s, h) => s + h.surplus, 0);
              if (history.length === 0) return null;
              return (
                <div key={cat.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-medium text-gray-800">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Totalt sparat</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(catSurplus)}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {history.map(h => (
                      <div key={h.label} className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs text-gray-500 w-20">{h.label}</span>
                        <div className="flex-1 mx-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min((h.spent / h.limit) * 100, 100)}%`, backgroundColor: h.spent > h.limit ? "#ef4444" : cat.color }} />
                          </div>
                        </div>
                        <div className="text-right min-w-[90px]">
                          <span className={`text-xs font-semibold ${h.surplus >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {h.surplus >= 0 ? "+" : ""}{formatCurrency(h.surplus)}
                          </span>
                          <p className="text-xs text-gray-300">{formatCurrency(h.spent)} / {formatCurrency(h.limit)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {categories.some(c => c.reset_frequency === "yearly") && (
            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
              Kategorier med årsbudget visas inte i historiken ännu.
            </div>
          )}
        </div>
      )}

      {/* ── ADD CATEGORY MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Ny kategori</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required placeholder="Kategorinamn"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <input type="number" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))}
                required min="1" placeholder="Budgetgräns (SEK)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />

              {/* Reset frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Återställningsintervall</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  {(["monthly", "yearly"] as const).map(f => (
                    <button key={f} type="button" onClick={() => setForm(ff => ({ ...ff, reset_frequency: f }))}
                      className={`flex-1 py-2.5 text-sm font-medium ${form.reset_frequency === f ? "bg-green-500 text-white" : "text-gray-500"}`}>
                      {f === "monthly" ? "Månadsvis" : "Årsvis"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.reset_frequency === "monthly" ? "Återställs dag (1–28)" : "Dag i månaden (1–28)"}
                </label>
                <input type="number" value={form.reset_day} min={1} max={28}
                  onChange={e => setForm(f => ({ ...f, reset_day: parseInt(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {form.reset_frequency === "yearly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Återställningsmånad</label>
                  <select value={form.reset_month} onChange={e => setForm(f => ({ ...f, reset_month: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ikon</label>
                <div className="grid grid-cols-8 gap-2">
                  {ICONS_LIST.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`text-xl p-1.5 rounded-lg ${form.icon === icon ? "bg-green-100 ring-2 ring-green-400" : "hover:bg-gray-100"}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Färg</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : ""}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
                {saving ? "Sparar..." : "Skapa kategori"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
