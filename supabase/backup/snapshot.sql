-- Snapshot — copy every app table into a private, timestamped `backup_YYYYMMDD_HHMI` schema
--
-- Run in SQL Editor right before a migration ("Run and enable RLS" if prompted).
-- Each run creates a NEW schema, so an earlier backup is never overwritten.
-- The backup schema is NOT exposed through the Supabase API (only `public` is).
--
-- Check it worked: the final SELECT lists row counts — live vs backup must match.
-- List backups:  select nspname from pg_namespace where nspname like 'backup_%';
-- Drop one:      drop schema backup_YYYYMMDD_HHMI cascade;

do $$
declare
  t text;
  s text := 'backup_' || to_char(now(), 'YYYYMMDD_HH24MI');
begin
  if exists (select 1 from pg_namespace where nspname = s) then
    raise exception 'Backup schema % already exists — wait a minute and re-run', s;
  end if;
  execute format('create schema %I', s);
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like '\_backup%'
  loop
    execute format('create table %I.%I as table public.%I', s, t, t);
  end loop;
  execute format('create table %I._policies as select * from pg_policies where schemaname = %L', s, 'public');
  execute format('create table %I._functions as select p.proname, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = %L and p.prokind = %L', s, 'public', 'f');
  raise notice 'Created %', s;
end $$;

-- Verify: live vs newest backup row counts
with latest as (
  select nspname as s from pg_namespace where nspname like 'backup\_%' order by oid desc limit 1
)
select (select s from latest) as backup_schema, t.tablename,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::int as live,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', (select s from latest), t.tablename), false, true, '')))[1]::text::int as backup
from pg_tables t
where t.schemaname = 'public' and t.tablename not like '\_backup%'
order by 2;
