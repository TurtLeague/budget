"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, BudgetCategory } from "@/lib/types";
import Link from "next/link";

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
  householdId: string | null;
  userId: string;
}

const ICONS = ["🛒", "🚗", "🍔", "☕", "🏠", "💊", "🎮", "✈️", "👕", "📱", "🎁", "💼"];

export default function TransactionsClient({ initialTransactions, categories, householdId, userId }: Props) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = transactions.filter(t => filter === "all" || t.type === filter);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        household_id: householdId,
        created_by: userId,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        category_id: form.category_id || null,
        date: form.date,
      })
      .select("*, profiles(display_name, avatar_color), budget_categories(name, color, icon)")
      .single();

    if (!error && data) {
      setTransactions(prev => [data as Transaction, ...prev]);
      setShowModal(false);
      setForm({ description: "", amount: "", type: "expense", category_id: "", date: new Date().toISOString().split("T")[0] });
    }
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    router.refresh();
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Transaktioner</h1>
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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "income", "expense"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-green-500 text-white" : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {f === "all" ? "Alla" : f === "income" ? "Inkomster" : "Utgifter"}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>Inga transaktioner ännu</p>
          </div>
        ) : (
          filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: t.budget_categories?.color ? `${t.budget_categories.color}20` : "#f3f4f6" }}
              >
                {t.budget_categories?.icon ?? (t.type === "income" ? "💵" : "💸")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(t.date)}
                  {t.profiles?.display_name && ` · ${t.profiles.display_name}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-gray-800"}`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </p>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-red-400 mt-0.5"
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Ny transaktion</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: "expense" }))}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    form.type === "expense" ? "bg-red-500 text-white" : "text-gray-500"
                  }`}
                >
                  Utgift
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: "income" }))}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    form.type === "income" ? "bg-green-500 text-white" : "text-gray-500"
                  }`}
                >
                  Inkomst
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="T.ex. ICA Maxi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belopp (SEK)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori (valfritt)</label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Ingen kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors"
              >
                {saving ? "Sparar..." : "Lägg till"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
