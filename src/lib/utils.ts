import type { RecurringTransaction } from "./types";

export function formatCurrency(amount: number, locale = "sv-SE", currency = "SEK") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function getPeriodStart(
  resetFrequency: "monthly" | "yearly",
  resetDay: number,
  resetMonth: number
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (resetFrequency === "monthly") {
    let start = new Date(today.getFullYear(), today.getMonth(), resetDay);
    if (start > today) start.setMonth(start.getMonth() - 1);
    return start;
  }

  // yearly
  let start = new Date(today.getFullYear(), resetMonth - 1, resetDay);
  if (start > today) start.setFullYear(start.getFullYear() - 1);
  return start;
}

export function getPeriodStartStr(
  resetFrequency: "monthly" | "yearly",
  resetDay: number,
  resetMonth: number
): string {
  const d = getPeriodStart(resetFrequency, resetDay, resetMonth);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isRecurringDue(r: RecurringTransaction): boolean {
  if (!r.active) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (r.end_date && new Date(r.end_date) < today) return false;
  if (new Date(r.start_date) > today) return false;

  const lastApplied = r.last_applied ? new Date(r.last_applied) : null;

  if (r.frequency === "monthly") {
    if (today.getDate() < r.day_of_month) return false;
    if (!lastApplied) return true;
    return (
      lastApplied.getMonth() !== today.getMonth() ||
      lastApplied.getFullYear() !== today.getFullYear()
    );
  }

  if (r.frequency === "yearly") {
    if (today.getMonth() + 1 !== r.month_of_year) return false;
    if (today.getDate() < r.day_of_month) return false;
    if (!lastApplied) return true;
    return lastApplied.getFullYear() !== today.getFullYear();
  }

  if (r.frequency === "weekly") {
    if (!lastApplied) return true;
    const daysSince = Math.floor((today.getTime() - lastApplied.getTime()) / 86400000);
    return daysSince >= 7;
  }

  return false;
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export const FREQ_LABELS: Record<string, string> = {
  weekly: "Varje vecka",
  monthly: "Varje månad",
  yearly: "Varje år",
};
