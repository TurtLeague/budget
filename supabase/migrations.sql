-- Run this in Supabase SQL Editor to add new features

-- 1. Add reset settings to budget_categories
alter table budget_categories
  add column if not exists reset_frequency text not null default 'monthly'
    check (reset_frequency in ('monthly', 'yearly')),
  add column if not exists reset_day int not null default 1
    check (reset_day between 1 and 28),
  add column if not exists reset_month int not null default 1
    check (reset_month between 1 and 12);

-- 2. Add recurring_id to transactions
alter table transactions
  add column if not exists recurring_id uuid references recurring_transactions(id) on delete set null;

-- Wait — create recurring_transactions first, then add the FK
-- (Run in two steps if needed)

-- 3. Recurring transactions table
create table if not exists recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete set null,
  category_id uuid references budget_categories(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  month_of_year int not null default 1 check (month_of_year between 1 and 12),
  start_date date not null default current_date,
  end_date date,
  last_applied date,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table recurring_transactions enable row level security;

create policy "household recurring transactions" on recurring_transactions
  for all to authenticated using (household_id = my_household_id());

-- 4. Now add the FK from transactions to recurring_transactions
alter table transactions
  add column if not exists recurring_id uuid references recurring_transactions(id) on delete set null;

-- 5. Enable real-time for transactions
alter publication supabase_realtime add table transactions;
