"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TrendPoint { month: string; income: number; expenses: number; }

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Inkomster vs utgifter</h2>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Inkomster" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Utgifter" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
