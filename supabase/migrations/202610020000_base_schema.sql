-- BotUang base schema for a fresh Supabase project.
-- Additive and safe: every object uses IF NOT EXISTS where possible.

create extension if not exists pgcrypto;

create table if not exists public.group_rentals (
  group_id text primary key,
  is_active boolean default false,
  start_at timestamptz,
  expire_at timestamptz,
  updated_by text,
  updated_at timestamptz default now(),
  password text,
  group_name text
);

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

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null default 0,
  note text,
  sender_id text,
  sender_name text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  name text not null,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  todo_text text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  remind_type text not null,
  remind_value text not null,
  remind_text text not null,
  created_by text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.custom_commands (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  keyword text not null,
  response text not null,
  media_path text,
  media_type text,
  caption_text text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.group_settings (
  group_id text primary key,
  header_text text,
  weather_location text,
  typo_enabled boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.dashboard_tokens (
  token text primary key,
  group_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  pin_verified boolean not null default false
);

create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  months integer not null default 1,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  proof_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists transactions_group_id_created_at_idx
  on public.transactions(group_id, created_at desc)
  where deleted_at is null;

create index if not exists participants_group_id_created_at_idx
  on public.participants(group_id, created_at desc)
  where deleted_at is null;

create index if not exists todos_group_id_created_at_idx
  on public.todos(group_id, created_at desc)
  where deleted_at is null;

create index if not exists reminders_group_id_created_at_idx
  on public.reminders(group_id, created_at desc)
  where deleted_at is null;

create index if not exists custom_commands_group_id_created_at_idx
  on public.custom_commands(group_id, created_at desc)
  where deleted_at is null;

create index if not exists rental_requests_group_id_created_at_idx
  on public.rental_requests(group_id, created_at desc);

create index if not exists user_group_access_user_id_idx
  on public.user_group_access(user_id);

create index if not exists user_group_access_group_id_idx
  on public.user_group_access(group_id);

alter table public.user_profiles enable row level security;
alter table public.user_group_access enable row level security;
alter table public.group_rentals enable row level security;
alter table public.transactions enable row level security;
alter table public.participants enable row level security;
alter table public.todos enable row level security;
alter table public.reminders enable row level security;
alter table public.custom_commands enable row level security;
alter table public.group_settings enable row level security;
alter table public.dashboard_tokens enable row level security;
alter table public.rental_requests enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own group access" on public.user_group_access;
create policy "Users can read own group access"
  on public.user_group_access
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own group access selection" on public.user_group_access;
create policy "Users can update own group access selection"
  on public.user_group_access
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read accessible group rentals" on public.group_rentals;
create policy "Users can read accessible group rentals"
  on public.group_rentals for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = group_rentals.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible transactions" on public.transactions;
create policy "Users can read accessible transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = transactions.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert accessible transactions" on public.transactions;
create policy "Users can insert accessible transactions"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = transactions.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible participants" on public.participants;
create policy "Users can read accessible participants"
  on public.participants for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = participants.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can write accessible participants" on public.participants;
create policy "Users can write accessible participants"
  on public.participants for all
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = participants.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = participants.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible todos" on public.todos;
create policy "Users can read accessible todos"
  on public.todos for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = todos.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can write accessible todos" on public.todos;
create policy "Users can write accessible todos"
  on public.todos for all
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = todos.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = todos.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible reminders" on public.reminders;
create policy "Users can read accessible reminders"
  on public.reminders for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = reminders.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert accessible reminders" on public.reminders;
create policy "Users can insert accessible reminders"
  on public.reminders for insert
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = reminders.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible commands" on public.custom_commands;
create policy "Users can read accessible commands"
  on public.custom_commands for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = custom_commands.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can write accessible commands" on public.custom_commands;
create policy "Users can write accessible commands"
  on public.custom_commands for all
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = custom_commands.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = custom_commands.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible settings" on public.group_settings;
create policy "Users can read accessible settings"
  on public.group_settings for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = group_settings.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can write accessible settings" on public.group_settings;
create policy "Users can write accessible settings"
  on public.group_settings for all
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = group_settings.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = group_settings.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible dashboard tokens" on public.dashboard_tokens;
create policy "Users can read accessible dashboard tokens"
  on public.dashboard_tokens for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = dashboard_tokens.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update accessible dashboard tokens" on public.dashboard_tokens;
create policy "Users can update accessible dashboard tokens"
  on public.dashboard_tokens for update
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = dashboard_tokens.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = dashboard_tokens.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read accessible rental requests" on public.rental_requests;
create policy "Users can read accessible rental requests"
  on public.rental_requests for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = rental_requests.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert accessible rental requests" on public.rental_requests;
create policy "Users can insert accessible rental requests"
  on public.rental_requests for insert
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = rental_requests.group_id
        and access.user_id = auth.uid()
    )
  );
