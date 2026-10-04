-- BotUang prayer/azan reminder service settings.
-- Additive migration: safe for existing production data.

alter table public.group_settings
  add column if not exists location_name text,
  add column if not exists location_latitude numeric,
  add column if not exists location_longitude numeric,
  add column if not exists location_timezone text not null default 'Asia/Jakarta',
  add column if not exists prayer_enabled boolean not null default false,
  add column if not exists prayer_method integer not null default 20,
  add column if not exists prayer_subuh_enabled boolean not null default true,
  add column if not exists prayer_dzuhur_enabled boolean not null default true,
  add column if not exists prayer_ashar_enabled boolean not null default true,
  add column if not exists prayer_maghrib_enabled boolean not null default true,
  add column if not exists prayer_isya_enabled boolean not null default true,
  add column if not exists prayer_reminder_offset_minutes integer not null default 0,
  add column if not exists prayer_schedule_cache jsonb,
  add column if not exists prayer_schedule_cached_for date,
  add column if not exists prayer_schedule_cached_at timestamptz,
  add column if not exists prayer_last_check_at timestamptz,
  add column if not exists prayer_last_error text;

create table if not exists public.prayer_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  prayer_date date not null,
  prayer_name text not null,
  offset_minutes integer not null default 0,
  scheduled_time text not null,
  sent_at timestamptz,
  status text not null default 'sent'
    check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (group_id, prayer_date, prayer_name, offset_minutes)
);

create index if not exists prayer_reminder_logs_group_date_idx
  on public.prayer_reminder_logs(group_id, prayer_date desc);

alter table public.prayer_reminder_logs enable row level security;

drop policy if exists "Users can read accessible prayer logs" on public.prayer_reminder_logs;
create policy "Users can read accessible prayer logs"
  on public.prayer_reminder_logs
  for select
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = prayer_reminder_logs.group_id
        and access.user_id = auth.uid()
    )
  );
