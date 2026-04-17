"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { BudgetCategory } from "@/lib/types";
import Link from "next/link";

interface Props {
  categories: BudgetCategory[];
  transactions: { amount: number; type: string; category_id: string | null }[];
  householdId: string | null;
}

const COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];
const ICONS_LIST = ["🛒", "🚗", "🍔", "🏠", "👕", "💊", "🎮", "✈️", "☕", "📱", "🎁", "💼", "🐾", "🎓", "⚡", "🔧"];

export default function BudgetClient({ categories: initial, transactions, householdId }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", monthly_limit: "", color: COLORS[0], icon: ICONS_LIST[0] });
  const [saving, setSaving] = useState(false);

  const spentByCategory = transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.category_id) acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount;
    return acc;
  }, {});

  const totalLimit = categories.reduce((s, c) => s + c.monthly_limit, 0);
  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("budget_categories")
      .insert({ household_id: householdId, name: form.name, monthly_limit: parseFloat(form.monthly_limit), color: form.color, icon: form.icon })
      .select()
      .single();
    if (!error && data) {
      setCategories(prev => [...prev, data as BudgetCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setShowModal(false);
      setForm({ name: "", monthly_limit: "", color: COLORS[0], icon: ICONS_LIST[0] });
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        {householdId && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg"
          >
            +
          </button>
        )}
      </div>

      {!householdId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-4">
          Gå med i ett hushåll först.{" "}
          <Link href="/settings" className="font-semibold underline">Inställningar →</Link>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 flex justify-between">
        <div>
          <p className="text-xs text-gray-400">Spenderat</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total budget</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(totalLimit)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Kvar</p>
          <p className={`text-xl font-bold ${totalLimit - totalSpent >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(totalLimit - totalSpent)}
          </p>
        </div>
      </div>

      {/* Overall bar */}
      {totalLimit > 0 && (
        <div className="mb-5">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%`,
                backgroundColor: totalSpent > totalLimit ? "#ef4444" : "#22c55e",
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {Math.round((totalSpent / totalLimit) * 100)}% av total budget använd
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>Inga budgetkategorier ännu</p>
          </div>
        ) : (
          categories.map(cat => {
            const spent = spentByCategory[cat.id] ?? 0;
            const pct = cat.monthly_limit > 0 ? Math.min((spent / cat.monthly_limit) * 100, 100) : 0;
            const over = spent > cat.monthly_limit;
            return (
              <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {over && <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">Över budget</span>}
                  </div>
                  <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-400">Ta bort</button>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>{formatCurrency(spent)} spenderat</span>
                  <span>{formatCurrency(cat.monthly_limit)} budget</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : cat.color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Ny kategori</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="T.ex. Mat & Hushåll"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Månadsbudget (SEK)</label>
                <input
                  type="number"
                  value={form.monthly_limit}
                  onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))}
                  required
                  min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ikon</label>
                <div className="grid grid-cols-8 gap-2">
                  {ICONS_LIST.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`text-xl p-1.5 rounded-lg ${form.icon === icon ? "bg-green-100 ring-2 ring-green-400" : "hover:bg-gray-100"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Färg</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors"
              >
                {saving ? "Sparar..." : "Skapa kategori"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
