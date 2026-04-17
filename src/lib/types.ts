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
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  household_id: string;
  created_by: string;
  category_id: string | null;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_color">;
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
