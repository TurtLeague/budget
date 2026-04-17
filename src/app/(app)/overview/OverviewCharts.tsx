"use client";
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ExpenseCat { name: string; color: string; icon: string; amount: number }
interface IncomeSource { name: string; amount: number }
interface DayData { day: number; income: number; expense: number }

const FALLBACK_COLORS = ["#6366f1","#f59e0b","#22c55e","#ef4444","#3b82f6","#ec4899","#14b8a6","#8b5cf6","#f97316","#06b6d4"];

export function ExpenseDonut({ data, total }: { data: ExpenseCat[]; total: number }) {
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(val: number) => formatCurrency(val)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full space-y-2 mt-2">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="dark:text-slate-300">{entry.icon} {entry.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">{total > 0 ? Math.round((entry.amount / total) * 100) : 0}%</span>
              <span className="font-medium dark:text-slate-200">{formatCurrency(entry.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IncomeDonut({ data, total }: { data: IncomeSource[]; total: number }) {
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(val: number) => formatCurrency(val)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full space-y-2 mt-2">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
              <span className="dark:text-slate-300 truncate max-w-[160px]">{entry.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">{total > 0 ? Math.round((entry.amount / total) * 100) : 0}%</span>
              <span className="font-medium dark:text-slate-200">{formatCurrency(entry.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyBar({ data }: { data: DayData[] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barSize={6} barGap={1}>
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
    </>
  );
}
