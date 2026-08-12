-- Run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/ursamfximgulayweflsz/sql/new

create table if not exists public.saju_readings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date not null,
  birth_time time not null,
  gender text not null check (gender in ('male', 'female', '?')),
  calendar_type text not null check (calendar_type in ('solar', 'lunar')),
  theme text not null default 'default',
  result text not null,
  created_at timestamptz not null default now()
);

alter table public.saju_readings enable row level security;

-- Anon clients can insert and read rows (tighten later with auth if needed)
create policy "Allow anon insert"
  on public.saju_readings
  for insert
  to anon
  with check (true);

create policy "Allow anon select"
  on public.saju_readings
  for select
  to anon
  using (true);
