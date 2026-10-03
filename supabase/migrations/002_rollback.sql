-- Rollback for 002_close_dm_tables_read.sql — recreates the dropped policies
-- exactly as exported on 2026-10-03.
--
-- ⚠️ This re-opens public read on dm_tables. Use only if 002 broke something,
--    then fix forward and re-run 002.

create policy "Anyone can lookup tables by invite code" on public.dm_tables
  for select to public using (true);

create policy "Anyone can read tables by invite code" on public.dm_tables
  for select to public using (auth.uid() is not null);

create policy "DM can manage own tables" on public.dm_tables
  for all to public using (user_id = auth.uid());

create policy "DM can read linked characters" on public.characters
  for select to public
  using (table_id in (select dm_tables.id from public.dm_tables where dm_tables.user_id = auth.uid()));

create policy "Users can view own characters" on public.characters
  for select to public using (auth.uid() = user_id);
