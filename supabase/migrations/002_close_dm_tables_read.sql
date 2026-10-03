-- 002 — Close public read on dm_tables + remove duplicate policies
--
-- ⚠️ Run ONLY AFTER the app version that uses get_table_names() is live on main.
--    Running earlier breaks table linking and table names for players.
--
-- Before: anyone (even signed out, with the public anon key) could read every
--         dm_tables row — chronicle, vault, notes, party snapshots, invite codes.
-- After:  only the DM reads their own tables; players get id + campaign_name
--         through get_table_names() (created in 001).

drop policy if exists "Anyone can lookup tables by invite code" on public.dm_tables;
drop policy if exists "Anyone can read tables by invite code"   on public.dm_tables;

-- Duplicates (covered by "Users can manage own table")
drop policy if exists "DM can manage own tables" on public.dm_tables;

-- Duplicates (covered by "DM can view characters at their table", which includes owner)
drop policy if exists "DM can read linked characters" on public.characters;
drop policy if exists "Users can view own characters" on public.characters;
