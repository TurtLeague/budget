"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { SavingsGoal } from "@/lib/types";
import Link from "next/link";

interface Props { initialGoals: SavingsGoal[]; householdId: string | null; }

const COLORS = ["#f59e0b","#22c55e","#6366f1","#ef4444","#3b82f6","#ec4899","#14b8a6"];
const GOAL_ICONS = ["🎯","🏡","🚗","✈️","💒","🎓","💻","🛥️","🎸","👶","🐕","🏋️"];
const INPUT = "w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

export default function SavingsClient({ initialGoals, householdId }: Props) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [showModal, setShowModal] = useState(false);
  const [depositModal, setDepositModal] = useState<SavingsGoal|null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [form, setForm] = useState({ name:"", target_amount:"", color:COLORS[0], icon:GOAL_ICONS[0], deadline:"" });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!householdId) return; setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("savings_goals")
      .insert({ household_id:householdId, name:form.name, target_amount:parseFloat(form.target_amount), color:form.color, icon:form.icon, deadline:form.deadline||null })
      .select().single();
    if (!error && data) { setGoals(prev => [...prev, data as SavingsGoal]); setShowModal(false); setForm({ name:"", target_amount:"", color:COLORS[0], icon:GOAL_ICONS[0], deadline:"" }); }
    setSaving(false); router.refresh();
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault(); if (!depositModal) return; setSaving(true);
    const supabase = createClient();
    const newAmount = depositModal.current_amount + parseFloat(depositAmount);
    const { error } = await supabase.from("savings_goals").update({ current_amount:newAmount }).eq("id", depositModal.id);
    if (!error) { setGoals(prev => prev.map(g => g.id===depositModal.id ? {...g,current_amount:newAmount} : g)); setDepositModal(null); setDepositAmount(""); }
    setSaving(false); router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("savings_goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id!==id));
    router.refresh();
  }

  const totalSaved = goals.reduce((s,g) => s+g.current_amount, 0);
  const totalTarget = goals.reduce((s,g) => s+g.target_amount, 0);

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold dark:text-slate-100">Sparmål</h1>
        {householdId && (
          <button onClick={() => setShowModal(true)} className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg">+</button>
        )}
      </div>

      {!householdId && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300 mb-4">
          Gå med i ett hushåll först. <Link href="/settings" className="font-semibold underline">Inställningar →</Link>
        </div>
      )}

      {goals.length > 0 && (
        <div className="bg-amber-400 rounded-2xl p-5 text-white mb-5">
          <p className="text-sm font-medium text-amber-100">Totalt sparat ❤️</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalSaved)}</p>
          <p className="text-sm text-amber-100 mt-1">av {formatCurrency(totalTarget)} totalt mål</p>
          <div className="h-2 bg-amber-300/50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width:`${totalTarget>0?Math.min((totalSaved/totalTarget)*100,100):0}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {goals.length===0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500"><div className="text-4xl mb-2">🎯</div><p>Inga sparmål ännu</p></div>
        ) : goals.map(goal => {
          const pct = goal.target_amount>0 ? Math.min((goal.current_amount/goal.target_amount)*100,100) : 0;
          const done = goal.current_amount>=goal.target_amount;
          const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime()-Date.now())/86400000) : null;
          return (
            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor:`${goal.color}20` }}>{goal.icon}</div>
                  <div>
                    <p className="font-semibold dark:text-slate-200">{goal.name}</p>
                    {done && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">Klart! 🎉❤️</span>}
                    {daysLeft!==null && !done && <p className="text-xs text-gray-400 dark:text-slate-400">{daysLeft>0?`${daysLeft} dagar kvar`:"Deadline passerad"}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(goal.id)} className="text-xs text-red-400">Ta bort</button>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold" style={{ color:goal.color }}>{formatCurrency(goal.current_amount)}</span>
                <span className="text-gray-400 dark:text-slate-400">{formatCurrency(goal.target_amount)}</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor:goal.color }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-slate-400">{Math.round(pct)}% av målet</span>
                {!done && <button onClick={() => setDepositModal(goal)} className="text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-1.5">+ Sätt in</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold dark:text-slate-100">Nytt sparmål</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="T.ex. Semester i Thailand" className={INPUT} />
              <input type="number" value={form.target_amount} onChange={e=>setForm(f=>({...f,target_amount:e.target.value}))} required min="1" placeholder="Målbelopp (SEK)" className={INPUT} />
              <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} className={INPUT} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Ikon</label>
                <div className="grid grid-cols-6 gap-2">
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f=>({...f,icon}))}
                      className={`text-2xl p-2 rounded-xl ${form.icon===icon?"bg-green-100 ring-2 ring-green-400":"hover:bg-gray-100 dark:hover:bg-slate-600"}`}>{icon}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Färg</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f=>({...f,color}))}
                      className={`w-8 h-8 rounded-full ${form.color===color?"scale-125 ring-2 ring-offset-2 ring-gray-400":""}`}
                      style={{ backgroundColor:color }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
                {saving?"Sparar...":"Skapa sparmål"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deposit modal */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold dark:text-slate-100">Sätt in pengar</h2>
              <button onClick={() => setDepositModal(null)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              {depositModal.icon} {depositModal.name} · Kvar: {formatCurrency(depositModal.target_amount-depositModal.current_amount)}
            </p>
            <form onSubmit={handleDeposit} className="space-y-4">
              <input type="number" value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} required min="1" placeholder="Belopp (SEK)" autoFocus className={INPUT} />
              <button type="submit" disabled={saving} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
                {saving?"Sparar...":"Bekräfta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
