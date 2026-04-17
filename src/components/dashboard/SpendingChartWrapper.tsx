"use client";
import dynamic from "next/dynamic";

const SpendingChart = dynamic(() => import("./SpendingChart"), { ssr: false });

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export default function SpendingChartWrapper({ data }: { data: ChartEntry[] }) {
  return <SpendingChart data={data} />;
}
