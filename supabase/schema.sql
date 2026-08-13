-- Run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/ursamfximgulayweflsz/sql/new

create table if not exists public.saju_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time time not null,
  gender text not null check (gender in ('male', 'female', '?')),
  calendar_type text not null check (calendar_type in ('solar', 'lunar')),
  theme text not null default 'default',
  result text not null,
  created_at timestamptz not null default now()
);

-- Existing projects: add user_id if the table already exists without it
alter table public.saju_readings
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists saju_readings_user_id_idx
  on public.saju_readings (user_id);

alter table public.saju_readings enable row level security;

-- Remove open anon policies from earlier setup
drop policy if exists "Allow anon insert" on public.saju_readings;
drop policy if exists "Allow anon select" on public.saju_readings;
drop policy if exists "Allow anon update" on public.saju_readings;
drop policy if exists "Allow anon delete" on public.saju_readings;
drop policy if exists "Users can select own readings" on public.saju_readings;
drop policy if exists "Users can insert own readings" on public.saju_readings;
drop policy if exists "Users can update own readings" on public.saju_readings;
drop policy if exists "Users can delete own readings" on public.saju_readings;

-- Logged-in users can only access their own rows
create policy "Users can select own readings"
  on public.saju_readings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own readings"
  on public.saju_readings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own readings"
  on public.saju_readings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own readings"
  on public.saju_readings
  for delete
  to authenticated
  using (auth.uid() = user_id);
