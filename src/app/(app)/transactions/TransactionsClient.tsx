"use client";
import { useState, useEffect } from "react";
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

const EMPTY_FORM = { description: "", amount: "", type: "expense" as "income"|"expense", category_id: "", date: new Date().toISOString().split("T")[0] };
const EMPTY_REC = { description: "", amount: "", type: "expense" as "income"|"expense", category_id: "", frequency: "monthly" as "weekly"|"monthly"|"yearly", day_of_month: 1, month_of_year: 1, start_date: new Date().toISOString().split("T")[0], end_date: "" };

const INPUT = "w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

// --- Sub-components defined OUTSIDE the main component to prevent remount on each render ---

interface TxFormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  categories: BudgetCategory[];
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  label: string;
}

function TxForm({ form, setForm, categories, saving, onSubmit, label }: TxFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
        {(["expense","income"] as const).map(t => (
          <button key={t} type="button" onClick={() => setForm(f=>({...f,type:t}))}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type===t ? (t==="expense"?"bg-red-500 text-white":"bg-green-500 text-white") : "text-gray-500 dark:text-slate-400"}`}>
            {t==="expense"?"Utgift":"Inkomst"}
          </button>
        ))}
      </div>
      <input type="text" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} required placeholder="Beskrivning" className={INPUT} />
      <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required min="0.01" step="0.01" placeholder="Belopp (SEK)" className={INPUT} />
      <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={INPUT} />
      {categories.length > 0 && (
        <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} className={INPUT}>
          <option value="">Ingen kategori</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      )}
      <button type="submit" disabled={saving} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
        {saving?"Sparar...":label}
      </button>
    </form>
  );
}

interface RecFormProps {
  recForm: typeof EMPTY_REC;
  setRecForm: React.Dispatch<React.SetStateAction<typeof EMPTY_REC>>;
  categories: BudgetCategory[];
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  label: string;
}

function RecForm({ recForm, setRecForm, categories, saving, onSubmit, label }: RecFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
        {(["expense","income"] as const).map(t => (
          <button key={t} type="button" onClick={() => setRecForm(f=>({...f,type:t}))}
            className={`flex-1 py-2.5 text-sm font-medium ${recForm.type===t ? (t==="expense"?"bg-red-500 text-white":"bg-green-500 text-white") : "text-gray-500 dark:text-slate-400"}`}>
            {t==="expense"?"Utgift":"Inkomst"}
          </button>
        ))}
      </div>
      <input type="text" value={recForm.description} onChange={e=>setRecForm(f=>({...f,description:e.target.value}))} required placeholder="T.ex. Hyra, Lön, Spotify" className={INPUT} />
      <input type="number" value={recForm.amount} onChange={e=>setRecForm(f=>({...f,amount:e.target.value}))} required min="0.01" step="0.01" placeholder="Belopp (SEK)" className={INPUT} />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Frekvens</label>
        <select value={recForm.frequency} onChange={e=>setRecForm(f=>({...f,frequency:e.target.value as "weekly"|"monthly"|"yearly"}))} className={INPUT}>
          <option value="weekly">Varje vecka</option>
          <option value="monthly">Varje månad</option>
          <option value="yearly">Varje år</option>
        </select>
      </div>
      {recForm.frequency !== "weekly" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Dag i månaden (1–28)</label>
          <input type="number" value={recForm.day_of_month} min={1} max={28} onChange={e=>setRecForm(f=>({...f,day_of_month:parseInt(e.target.value)}))} className={INPUT} />
        </div>
      )}
      {recForm.frequency === "yearly" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Månad</label>
          <select value={recForm.month_of_year} onChange={e=>setRecForm(f=>({...f,month_of_year:parseInt(e.target.value)}))} className={INPUT}>
            {MONTH_NAMES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      )}
      {categories.length > 0 && (
        <select value={recForm.category_id} onChange={e=>setRecForm(f=>({...f,category_id:e.target.value}))} className={INPUT}>
          <option value="">Ingen kategori</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Slutdatum (valfritt)</label>
        <input type="date" value={recForm.end_date} onChange={e=>setRecForm(f=>({...f,end_date:e.target.value}))} className={INPUT} />
      </div>
      <button type="submit" disabled={saving} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
        {saving?"Sparar...":label}
      </button>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Main component ---

export default function TransactionsClient({ initialTransactions, categories, initialRecurring, householdId, userId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"list"|"recurring">("list");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [recurring, setRecurring] = useState(initialRecurring);

  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all"|"income"|"expense">("all");

  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<Transaction|null>(null);
  const [showRecModal, setShowRecModal] = useState(false);
  const [editRec, setEditRec] = useState<RecurringTransaction|null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [recForm, setRecForm] = useState(EMPTY_REC);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTransactions(initialTransactions); }, [initialTransactions]);
  useEffect(() => { setRecurring(initialRecurring); }, [initialRecurring]);

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    const ch = supabase.channel("tx-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${householdId}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [householdId, router]);

  const monthPrefix = `${selYear}-${String(selMonth + 1).padStart(2, "0")}`;
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();

  const filtered = transactions.filter(t => {
    if (!t.date.startsWith(monthPrefix)) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const monthIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function prevMonth() { if (selMonth === 0) { setSelYear(y => y-1); setSelMonth(11); } else setSelMonth(m => m-1); }
  function nextMonth() { if (isCurrentMonth) return; if (selMonth === 11) { setSelYear(y => y+1); setSelMonth(0); } else setSelMonth(m => m+1); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!householdId) return; setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("transactions")
      .insert({ household_id: householdId, created_by: userId, description: form.description, amount: parseFloat(form.amount), type: form.type, category_id: form.category_id||null, date: form.date })
      .select("*, profiles(display_name, avatar_color, avatar_url), budget_categories(name, color, icon)").single();
    if (!error && data) { setTransactions(prev => [data as Transaction, ...prev].sort((a,b) => b.date.localeCompare(a.date))); setShowAdd(false); setForm(EMPTY_FORM); }
    setSaving(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTx) return; setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("transactions")
      .update({ description: form.description, amount: parseFloat(form.amount), type: form.type, category_id: form.category_id||null, date: form.date })
      .eq("id", editTx.id)
      .select("*, profiles(display_name, avatar_color, avatar_url), budget_categories(name, color, icon)").single();
    if (!error && data) { setTransactions(prev => prev.map(t => t.id === editTx.id ? data as Transaction : t)); setEditTx(null); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  function openEdit(t: Transaction) {
    setForm({ description: t.description, amount: String(t.amount), type: t.type, category_id: t.category_id??'', date: t.date });
    setEditTx(t);
  }

  async function handleAddRec(e: React.FormEvent) {
    e.preventDefault(); if (!householdId) return; setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("recurring_transactions")
      .insert({ household_id: householdId, created_by: userId, description: recForm.description, amount: parseFloat(recForm.amount), type: recForm.type, category_id: recForm.category_id||null, frequency: recForm.frequency, day_of_month: recForm.day_of_month, month_of_year: recForm.month_of_year, start_date: recForm.start_date, end_date: recForm.end_date||null })
      .select("*, budget_categories(name, color, icon)").single();
    if (!error && data) { setRecurring(prev => [data as RecurringTransaction, ...prev]); setShowRecModal(false); setRecForm(EMPTY_REC); }
    setSaving(false);
  }

  async function handleEditRec(e: React.FormEvent) {
    e.preventDefault(); if (!editRec) return; setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("recurring_transactions")
      .update({ description: recForm.description, amount: parseFloat(recForm.amount), type: recForm.type, category_id: recForm.category_id||null, frequency: recForm.frequency, day_of_month: recForm.day_of_month, month_of_year: recForm.month_of_year, end_date: recForm.end_date||null })
      .eq("id", editRec.id).select("*, budget_categories(name, color, icon)").single();
    if (!error && data) { setRecurring(prev => prev.map(r => r.id === editRec.id ? data as RecurringTransaction : r)); setEditRec(null); }
    setSaving(false);
  }

  function openEditRec(r: RecurringTransaction) {
    setRecForm({ description: r.description, amount: String(r.amount), type: r.type, category_id: r.category_id??'', frequency: r.frequency, day_of_month: r.day_of_month, month_of_year: r.month_of_year, start_date: r.start_date, end_date: r.end_date??'' });
    setEditRec(r);
  }

  async function toggleRec(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("recurring_transactions").update({ active }).eq("id", id);
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, active } : r));
  }

  async function deleteRec(id: string) {
    const supabase = createClient();
    await supabase.from("recurring_transactions").delete().eq("id", id);
    setRecurring(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold dark:text-slate-100">Transaktioner</h1>
        {householdId && (
          <button onClick={() => tab==="list" ? setShowAdd(true) : setShowRecModal(true)}
            className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">+</button>
        )}
      </div>

      {!householdId && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300 mb-4">
          Gå med i ett hushåll först. <Link href="/settings" className="font-semibold underline">Inställningar →</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 mb-4">
        {(["list","recurring"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab===t ? "bg-green-500 text-white" : "text-gray-500 dark:text-slate-400"}`}>
            {t==="list"?"Transaktioner":"Återkommande"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm mb-3">
            <button onClick={prevMonth} className="text-gray-500 dark:text-slate-400 text-xl px-2">‹</button>
            <span className="text-sm font-semibold dark:text-slate-200">{MONTH_NAMES[selMonth]} {selYear}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className={`text-xl px-2 ${isCurrentMonth?"text-gray-200 dark:text-slate-600":"text-gray-500 dark:text-slate-400"}`}>›</button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600">Inkomster</p>
              <p className="text-base font-bold text-green-700">+{formatCurrency(monthIncome)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500">Utgifter</p>
              <p className="text-base font-bold text-red-600">-{formatCurrency(monthExpense)}</p>
            </div>
          </div>

          {/* Search + filter */}
          <div className="space-y-2 mb-4">
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Sök transaktion..."
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              {(["all","income","expense"] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter===f ? "bg-green-500 text-white" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600"}`}>
                  {f==="all"?"Alla":f==="income"?"Inkomster":"Utgifter"}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <div className="text-4xl mb-2">📭</div>
                <p>{search?"Inga matchande transaktioner":"Inga transaktioner denna månad"}</p>
              </div>
            ) : filtered.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: t.budget_categories?.color ? `${t.budget_categories.color}20` : "#f3f4f6" }}>
                  {t.budget_categories?.icon ?? (t.type==="income"?"💵":"💸")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium dark:text-slate-200 truncate">{t.description}</p>
                    {t.recurring_id && <span className="text-xs text-gray-400">🔄</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-400">
                    {formatDate(t.date)}{t.profiles?.display_name ? ` · ${t.profiles.display_name}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${t.type==="income"?"text-green-600":"dark:text-slate-200"}`}>
                    {t.type==="income"?"+":"-"}{formatCurrency(t.amount)}
                  </p>
                  <div className="flex gap-2 justify-end mt-0.5">
                    <button onClick={() => openEdit(t)} className="text-xs text-blue-400">Redigera</button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400">Ta bort</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "recurring" && (
        <div className="space-y-3">
          {recurring.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <div className="text-4xl mb-2">🔄</div>
              <p>Inga återkommande transaktioner</p>
              <p className="text-xs mt-1">Lägg till lön, hyra, prenumerationer...</p>
            </div>
          ) : recurring.map(r => (
            <div key={r.id} className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm ${!r.active?"opacity-50":""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: r.budget_categories?.color ? `${r.budget_categories.color}20` : "#f3f4f6" }}>
                    {r.budget_categories?.icon ?? (r.type==="income"?"💵":"💸")}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-slate-200">{r.description}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">{FREQ_LABELS[r.frequency]}</p>
                    {r.frequency==="monthly" && <p className="text-xs text-gray-400 dark:text-slate-400">Dag {r.day_of_month} varje månad</p>}
                    {r.frequency==="yearly" && <p className="text-xs text-gray-400 dark:text-slate-400">{r.day_of_month} {MONTH_NAMES[r.month_of_year-1]} varje år</p>}
                    {r.last_applied && <p className="text-xs text-gray-300 dark:text-slate-500">Senast: {formatDate(r.last_applied)}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${r.type==="income"?"text-green-600":"dark:text-slate-200"}`}>
                    {r.type==="income"?"+":"-"}{formatCurrency(r.amount)}
                  </p>
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => openEditRec(r)} className="text-xs text-blue-400">Redigera</button>
                    <button onClick={() => toggleRec(r.id, !r.active)} className="text-xs text-gray-400">{r.active?"Pausa":"Aktivera"}</button>
                    <button onClick={() => deleteRec(r.id)} className="text-xs text-red-400">Ta bort</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Ny transaktion" onClose={() => setShowAdd(false)}>
          <TxForm form={form} setForm={setForm} categories={categories} saving={saving} onSubmit={handleAdd} label="Lägg till" />
        </Modal>
      )}
      {editTx && (
        <Modal title="Redigera transaktion" onClose={() => setEditTx(null)}>
          <TxForm form={form} setForm={setForm} categories={categories} saving={saving} onSubmit={handleEdit} label="Spara ändringar" />
        </Modal>
      )}
      {showRecModal && (
        <Modal title="Ny återkommande" onClose={() => setShowRecModal(false)}>
          <RecForm recForm={recForm} setRecForm={setRecForm} categories={categories} saving={saving} onSubmit={handleAddRec} label="Skapa återkommande" />
        </Modal>
      )}
      {editRec && (
        <Modal title="Redigera återkommande" onClose={() => setEditRec(null)}>
          <RecForm recForm={recForm} setRecForm={setRecForm} categories={categories} saving={saving} onSubmit={handleEditRec} label="Spara ändringar" />
        </Modal>
      )}
    </div>
  );
}
