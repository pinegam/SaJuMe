-- Run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/ursamfximgulayweflsz/sql/new

-- ---------------------------------------------------------------------------
-- users: login profile (name, birth info). Separate from saju_readings.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  birth_date date,
  birth_time time,
  gender text check (gender is null or gender in ('male', 'female', '?')),
  calendar_type text not null default 'solar'
    check (calendar_type in ('solar', 'lunar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can select own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can delete own profile" on public.users;

create policy "Users can select own profile"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.users
  for delete
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- saju_readings: saved interpretation history (separate from users)
-- ---------------------------------------------------------------------------
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

alter table public.saju_readings
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists saju_readings_user_id_idx
  on public.saju_readings (user_id);

alter table public.saju_readings enable row level security;

drop policy if exists "Allow anon insert" on public.saju_readings;
drop policy if exists "Allow anon select" on public.saju_readings;
drop policy if exists "Allow anon update" on public.saju_readings;
drop policy if exists "Allow anon delete" on public.saju_readings;
drop policy if exists "Users can select own readings" on public.saju_readings;
drop policy if exists "Users can insert own readings" on public.saju_readings;
drop policy if exists "Users can update own readings" on public.saju_readings;
drop policy if exists "Users can delete own readings" on public.saju_readings;

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
