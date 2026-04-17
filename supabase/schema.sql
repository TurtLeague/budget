-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Households: a shared economy for two users
create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text unique default substring(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- Profiles linked to auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text,
  avatar_color text default '#22c55e',
  created_at timestamptz default now()
);

-- Budget categories
create table budget_categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  icon text default '💰',
  monthly_limit numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete set null,
  category_id uuid references budget_categories(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Savings goals
create table savings_goals (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  color text default '#f59e0b',
  icon text default '🎯',
  deadline date,
  created_at timestamptz default now()
);

-- RLS policies
alter table households enable row level security;
alter table profiles enable row level security;
alter table budget_categories enable row level security;
alter table transactions enable row level security;
alter table savings_goals enable row level security;

-- Helper: get the caller's household_id
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id from profiles where id = auth.uid()
$$;

-- Households: members can read/update their own
create policy "household members can read" on households
  for select using (id = my_household_id());

create policy "household members can update" on households
  for update using (id = my_household_id());

create policy "anyone can create household" on households
  for insert with check (true);

-- Profiles: users manage their own row
create policy "own profile" on profiles
  for all using (id = auth.uid());

create policy "household members can read profiles" on profiles
  for select using (household_id = my_household_id());

-- Budget categories: household members
create policy "household budget categories" on budget_categories
  for all using (household_id = my_household_id());

-- Transactions: household members
create policy "household transactions" on transactions
  for all using (household_id = my_household_id());

-- Savings goals: household members
create policy "household savings goals" on savings_goals
  for all using (household_id = my_household_id());

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
