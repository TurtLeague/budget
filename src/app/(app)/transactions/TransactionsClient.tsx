"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, MONTH_NAMES, FREQ_LABELS } from "@/lib/utils";
import type { Transaction, BudgetCategory, RecurringTransaction } from "@/lib/types";

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
  initialRecurring: RecurringTransaction[];
  householdId: string | null;
  userId: string;
}

const EMPTY_FORM = {
  description: "", amount: "", type: "expense" as "income" | "expense",
  category_id: "", date: new Date().toISOString().split("T")[0],
};
const EMPTY_RECURRING = {
  description: "", amount: "", type: "expense" as "income" | "expense",
  category_id: "", frequency: "monthly" as "weekly" | "monthly" | "yearly",
  day_of_month: 1, month_of_year: 1,
  start_date: new Date().toISOString().split("T")[0], end_date: "",
};

export default function TransactionsClient({ initialTransactions, categories, initialRecurring, householdId, userId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"list" | "recurring">("list");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [recurring, setRecurring] = useState(initialRecurring);

  // Month navigation
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-indexed

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  // Forms
  const [form, setForm] = useState(EMPTY_FORM);
  const [recurringForm, setRecurringForm] = useState(EMPTY_RECURRING);
  const [saving, setSaving] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("transactions-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${householdId}` },
        () => { router.refresh(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, router]);

  // Sync when server refreshes
  useEffect(() => { setTransactions(initialTransactions); }, [initialTransactions]);
  useEffect(() => { setRecurring(initialRecurring); }, [initialRecurring]);

  const monthPrefix = `${selYear}-${String(selMonth + 1).padStart(2, "0")}`;

  const filtered = transactions.filter(t => {
    if (!t.date.startsWith(monthPrefix)) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const monthIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function prevMonth() {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  }

  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        household_id: householdId, created_by: userId,
        description: form.description, amount: parseFloat(form.amount),
        type: form.type, category_id: form.category_id || null, date: form.date,
      })
      .select("*, profiles(display_name, avatar_color), budget_categories(name, color, icon)")
      .single();
    if (!error && data) {
      setTransactions(prev => [data as Transaction, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setShowAdd(false);
      setForm(EMPTY_FORM);
    }
    setSaving(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTx) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .update({
        description: form.description, amount: parseFloat(form.amount),
        type: form.type, category_id: form.category_id || null, date: form.date,
      })
      .eq("id", editTx.id)
      .select("*, profiles(display_name, avatar_color), budget_categories(name, color, icon)")
      .single();
    if (!error && data) {
      setTransactions(prev => prev.map(t => t.id === editTx.id ? data as Transaction : t));
      setEditTx(null);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  function openEdit(t: Transaction) {
    setForm({ description: t.description, amount: String(t.amount), type: t.type, category_id: t.category_id ?? "", date: t.date });
    setEditTx(t);
  }

  async function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_transactions")
      .insert({
        household_id: householdId, created_by: userId,
        description: recurringForm.description, amount: parseFloat(recurringForm.amount),
        type: recurringForm.type, category_id: recurringForm.category_id || null,
        frequency: recurringForm.frequency,
        day_of_month: recurringForm.day_of_month,
        month_of_year: recurringForm.month_of_year,
        start_date: recurringForm.start_date,
        end_date: recurringForm.end_date || null,
      })
      .select("*, budget_categories(name, color, icon)")
      .single();
    if (!error && data) {
      setRecurring(prev => [data as RecurringTransaction, ...prev]);
      setShowRecurringModal(false);
      setRecurringForm(EMPTY_RECURRING);
    }
    setSaving(false);
  }

  async function toggleRecurring(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("recurring_transactions").update({ active }).eq("id", id);
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, active } : r));
  }

  async function deleteRecurring(id: string) {
    const supabase = createClient();
    await supabase.from("recurring_transactions").delete().eq("id", id);
    setRecurring(prev => prev.filter(r => r.id !== id));
  }

  const TransactionForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(["expense", "income"] as const).map(t => (
          <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type === t ? (t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white") : "text-gray-500"}`}>
            {t === "expense" ? "Utgift" : "Inkomst"}
          </button>
        ))}
      </div>
      <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        required placeholder="Beskrivning"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
        required min="0.01" step="0.01" placeholder="Belopp (SEK)"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      {categories.length > 0 && (
        <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Ingen kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      )}
      <button type="submit" disabled={saving}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
        {saving ? "Sparar..." : submitLabel}
      </button>
    </form>
  );

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Transaktioner</h1>
        {householdId && tab === "list" && (
          <button onClick={() => setShowAdd(true)}
            className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">+</button>
        )}
        {householdId && tab === "recurring" && (
          <button onClick={() => setShowRecurringModal(true)}
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
        <button onClick={() => setTab("list")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "list" ? "bg-green-500 text-white" : "text-gray-500"}`}>
          Transaktioner
        </button>
        <button onClick={() => setTab("recurring")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "recurring" ? "bg-green-500 text-white" : "text-gray-500"}`}>
          Återkommande
        </button>
      </div>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm mb-3">
            <button onClick={prevMonth} className="text-gray-500 text-xl px-2">‹</button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[selMonth]} {selYear}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className={`text-xl px-2 ${isCurrentMonth ? "text-gray-200" : "text-gray-500"}`}>›</button>
          </div>

          {/* Month summary */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600">Inkomster</p>
              <p className="text-base font-bold text-green-700">+{formatCurrency(monthIncome)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500">Utgifter</p>
              <p className="text-base font-bold text-red-600">-{formatCurrency(monthExpense)}</p>
            </div>
          </div>

          {/* Search + type filter */}
          <div className="space-y-2 mb-4">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Sök transaktion..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              {(["all", "income", "expense"] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === f ? "bg-green-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
                  {f === "all" ? "Alla" : f === "income" ? "Inkomster" : "Utgifter"}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>{search ? "Inga matchande transaktioner" : "Inga transaktioner denna månad"}</p>
              </div>
            ) : (
              filtered.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: t.budget_categories?.color ? `${t.budget_categories.color}20` : "#f3f4f6" }}>
                    {t.budget_categories?.icon ?? (t.type === "income" ? "💵" : "💸")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                      {t.recurring_id && <span className="text-xs text-gray-400">🔄</span>}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(t.date)}{t.profiles?.display_name ? ` · ${t.profiles.display_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-gray-800"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </p>
                    <div className="flex gap-2 justify-end mt-0.5">
                      <button onClick={() => openEdit(t)} className="text-xs text-blue-400">Redigera</button>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400">Ta bort</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── RECURRING TAB ── */}
      {tab === "recurring" && (
        <div className="space-y-3">
          {recurring.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🔄</div>
              <p>Inga återkommande transaktioner</p>
              <p className="text-xs mt-1">Lägg till lön, hyra, prenumerationer...</p>
            </div>
          ) : (
            recurring.map(r => (
              <div key={r.id} className={`bg-white rounded-xl p-4 shadow-sm ${!r.active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: r.budget_categories?.color ? `${r.budget_categories.color}20` : "#f3f4f6" }}>
                      {r.budget_categories?.icon ?? (r.type === "income" ? "💵" : "💸")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.description}</p>
                      <p className="text-xs text-gray-400">{FREQ_LABELS[r.frequency]}</p>
                      {r.frequency === "monthly" && <p className="text-xs text-gray-400">Dag {r.day_of_month} varje månad</p>}
                      {r.frequency === "yearly" && <p className="text-xs text-gray-400">{r.day_of_month} {MONTH_NAMES[r.month_of_year - 1]} varje år</p>}
                      {r.last_applied && <p className="text-xs text-gray-300">Senast: {formatDate(r.last_applied)}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${r.type === "income" ? "text-green-600" : "text-gray-800"}`}>
                      {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
                    </p>
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={() => toggleRecurring(r.id, !r.active)}
                        className="text-xs text-gray-400">{r.active ? "Pausa" : "Aktivera"}</button>
                      <button onClick={() => deleteRecurring(r.id)} className="text-xs text-red-400">Ta bort</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ADD TRANSACTION MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Ny transaktion</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <TransactionForm onSubmit={handleAdd} submitLabel="Lägg till" />
          </div>
        </div>
      )}

      {/* ── EDIT TRANSACTION MODAL ── */}
      {editTx && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Redigera transaktion</h2>
              <button onClick={() => setEditTx(null)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <TransactionForm onSubmit={handleEdit} submitLabel="Spara ändringar" />
          </div>
        </div>
      )}

      {/* ── ADD RECURRING MODAL ── */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Ny återkommande</h2>
              <button onClick={() => setShowRecurringModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAddRecurring} className="space-y-4">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(["expense", "income"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setRecurringForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2.5 text-sm font-medium ${recurringForm.type === t ? (t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white") : "text-gray-500"}`}>
                    {t === "expense" ? "Utgift" : "Inkomst"}
                  </button>
                ))}
              </div>
              <input type="text" value={recurringForm.description} onChange={e => setRecurringForm(f => ({ ...f, description: e.target.value }))}
                required placeholder="T.ex. Hyra, Lön, Spotify"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <input type="number" value={recurringForm.amount} onChange={e => setRecurringForm(f => ({ ...f, amount: e.target.value }))}
                required min="0.01" step="0.01" placeholder="Belopp (SEK)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frekvens</label>
                <select value={recurringForm.frequency} onChange={e => setRecurringForm(f => ({ ...f, frequency: e.target.value as "weekly" | "monthly" | "yearly" }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="weekly">Varje vecka</option>
                  <option value="monthly">Varje månad</option>
                  <option value="yearly">Varje år</option>
                </select>
              </div>
              {recurringForm.frequency !== "weekly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dag i månaden (1–28)</label>
                  <input type="number" value={recurringForm.day_of_month} min={1} max={28}
                    onChange={e => setRecurringForm(f => ({ ...f, day_of_month: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}
              {recurringForm.frequency === "yearly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Månad</label>
                  <select value={recurringForm.month_of_year} onChange={e => setRecurringForm(f => ({ ...f, month_of_year: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              )}
              {categories.length > 0 && (
                <select value={recurringForm.category_id} onChange={e => setRecurringForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Ingen kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input type="date" value={recurringForm.start_date} onChange={e => setRecurringForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slutdatum (valfritt)</label>
                <input type="date" value={recurringForm.end_date} onChange={e => setRecurringForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
                {saving ? "Sparar..." : "Skapa återkommande"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
