-- BotUang finance workspace settings.
-- Additive migration: safe for existing production data.

alter table public.group_settings
  add column if not exists azan_location text,
  add column if not exists emergency_location text,
  add column if not exists weather_enabled boolean not null default true,
  add column if not exists azan_enabled boolean not null default false,
  add column if not exists emergency_enabled boolean not null default false,
  add column if not exists spreadsheet_url text;

create table if not exists public.owner_settings (
  id text primary key default 'default',
  qris_image_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.owner_settings enable row level security;

drop policy if exists "Authenticated users can read owner settings" on public.owner_settings;
create policy "Authenticated users can read owner settings"
  on public.owner_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Owners can insert owner settings" on public.owner_settings;
create policy "Owners can insert owner settings"
  on public.owner_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles profile
      where profile.user_id = auth.uid()
        and profile.platform_role = 'owner'
    )
  );

drop policy if exists "Owners can update owner settings" on public.owner_settings;
create policy "Owners can update owner settings"
  on public.owner_settings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles profile
      where profile.user_id = auth.uid()
        and profile.platform_role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles profile
      where profile.user_id = auth.uid()
        and profile.platform_role = 'owner'
    )
  );
