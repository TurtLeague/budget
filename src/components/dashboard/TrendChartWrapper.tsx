"use client";
import dynamic from "next/dynamic";

const TrendChart = dynamic(() => import("./TrendChart"), { ssr: false });

interface TrendPoint { month: string; income: number; expenses: number; }
export default function TrendChartWrapper({ data }: { data: TrendPoint[] }) {
  return <TrendChart data={data} />;
}
