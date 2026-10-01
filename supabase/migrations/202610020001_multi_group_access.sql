-- BotUang Phase 1 access model.
-- Additive and production-safe: no existing tables are dropped or rewritten.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  platform_role text not null default 'admin'
    check (platform_role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_group_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null,
  group_name text,
  role text not null default 'admin'
    check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_selected_at timestamptz,
  unique (user_id, group_id)
);

create index if not exists user_group_access_user_id_idx
  on public.user_group_access(user_id);

create index if not exists user_group_access_group_id_idx
  on public.user_group_access(group_id);

alter table public.user_profiles enable row level security;
alter table public.user_group_access enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own profile email only via app metadata" on public.user_profiles;
create policy "Users can update own profile email only via app metadata"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own group access" on public.user_group_access;
create policy "Users can read own group access"
  on public.user_group_access
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own group last selected" on public.user_group_access;
create policy "Users can update own group last selected"
  on public.user_group_access
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Writes to user_group_access should be performed by trusted server routes
-- after validating dashboard tokens / PINs. Do not grant public insert here.
