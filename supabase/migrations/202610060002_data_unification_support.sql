-- Phase J support objects for repeatable SQLite -> Supabase imports.
-- This migration is additive and does not mutate existing business rows.

begin;

create table if not exists public.bot_data_mappings (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (
    entity in (
      'transactions',
      'participants',
      'todos',
      'reminders',
      'custom_commands',
      'group_settings',
      'group_rentals',
      'rental_requests',
      'dashboard_tokens'
    )
  ),
  source_system text not null,
  source_record_id text not null,
  target_record_id text not null,
  group_id text not null,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  unique (entity, source_system, source_record_id)
);

create index if not exists bot_data_mappings_group_entity_idx
  on public.bot_data_mappings(group_id, entity);

alter table public.bot_data_mappings enable row level security;

-- Deliberately no authenticated-user policy. Only trusted server/service-role
-- migration code can read or write provenance mappings.

alter table public.custom_commands
  add column if not exists updated_at timestamptz default now();

alter table public.custom_commands
  add column if not exists media_url text;

create unique index if not exists custom_commands_active_group_keyword_idx
  on public.custom_commands(group_id, lower(keyword))
  where deleted_at is null;

commit;
