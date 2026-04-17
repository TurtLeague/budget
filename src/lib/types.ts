export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  household_id: string | null;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number;
  reset_frequency: "monthly" | "yearly";
  reset_day: number;
  reset_month: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  household_id: string;
  created_by: string;
  category_id: string | null;
  recurring_id: string | null;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_color">;
  budget_categories?: Pick<BudgetCategory, "name" | "color" | "icon">;
}

export interface RecurringTransaction {
  id: string;
  household_id: string;
  created_by: string;
  category_id: string | null;
  amount: number;
  type: "income" | "expense";
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  day_of_month: number;
  month_of_year: number;
  start_date: string;
  end_date: string | null;
  last_applied: string | null;
  active: boolean;
  created_at: string;
  budget_categories?: Pick<BudgetCategory, "name" | "color" | "icon">;
}

export interface SavingsGoal {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
  deadline: string | null;
  created_at: string;
}
