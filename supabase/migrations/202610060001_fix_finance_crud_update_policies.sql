drop policy if exists "Users can update accessible transactions" on public.transactions;
create policy "Users can update accessible transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = transactions.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = transactions.group_id
        and access.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update accessible reminders" on public.reminders;
create policy "Users can update accessible reminders"
  on public.reminders for update
  using (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = reminders.group_id
        and access.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_group_access access
      where access.group_id = reminders.group_id
        and access.user_id = auth.uid()
    )
  );
