"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export default function SpendingChart({ data }: { data: ChartEntry[] }) {
  if (!data.length) return null;

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-3">Utgifter per kategori</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              dataKey="value"
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Spenderat"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 mt-1">
          {data.map(item => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.icon} {item.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
