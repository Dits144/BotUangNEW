-- Phase J: explicit group-scoped CRUD policies for canonical financial data.
-- Repeatable and non-destructive. Soft deletion is handled by UPDATE policies.

begin;

alter table public.transactions enable row level security;
alter table public.todos enable row level security;
alter table public.reminders enable row level security;
alter table public.custom_commands enable row level security;

-- Policy names changed during earlier iterations. Remove every previous policy
-- on these four tables so no legacy ALL/SELECT policy can retain broad access.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'transactions',
    'todos',
    'reminders',
    'custom_commands'
  ]
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        existing_policy.policyname,
        target_table
      );
    end loop;
  end loop;
end
$$;

create policy "Users can read accessible transactions"
  on public.transactions for select
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = transactions.group_id
    )
  );

create policy "Users can insert accessible transactions"
  on public.transactions for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = transactions.group_id
    )
  );

create policy "Users can update accessible transactions"
  on public.transactions for update
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = transactions.group_id
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = transactions.group_id
    )
  );

create policy "Users can delete accessible transactions"
  on public.transactions for delete
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = transactions.group_id
    )
  );

create policy "Users can read accessible todos"
  on public.todos for select
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = todos.group_id
    )
  );

create policy "Users can insert accessible todos"
  on public.todos for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = todos.group_id
    )
  );

create policy "Users can update accessible todos"
  on public.todos for update
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = todos.group_id
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = todos.group_id
    )
  );

create policy "Users can delete accessible todos"
  on public.todos for delete
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = todos.group_id
    )
  );

create policy "Users can read accessible reminders"
  on public.reminders for select
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = reminders.group_id
    )
  );

create policy "Users can insert accessible reminders"
  on public.reminders for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = reminders.group_id
    )
  );

create policy "Users can update accessible reminders"
  on public.reminders for update
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = reminders.group_id
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = reminders.group_id
    )
  );

create policy "Users can delete accessible reminders"
  on public.reminders for delete
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = reminders.group_id
    )
  );

create policy "Users can read accessible commands"
  on public.custom_commands for select
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = custom_commands.group_id
    )
  );

create policy "Users can insert accessible commands"
  on public.custom_commands for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = custom_commands.group_id
    )
  );

create policy "Users can update accessible commands"
  on public.custom_commands for update
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = custom_commands.group_id
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = custom_commands.group_id
    )
  );

create policy "Users can delete accessible commands"
  on public.custom_commands for delete
  to authenticated
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_group_access access
      where access.user_id = auth.uid()
        and access.group_id = custom_commands.group_id
    )
  );

commit;
