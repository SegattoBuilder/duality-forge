-- Snapshot — copy every app table into a private `backup_YYYYMMDD` schema
--
-- Run in SQL Editor right before a migration. Takes seconds at current size.
-- The backup schema is NOT exposed through the Supabase API (only `public` is),
-- so users can't read it. Change the date in BOTH places below if re-running.
--
-- Check it worked: the final SELECT lists row counts — live vs backup must match.

create schema if not exists backup_20261003;

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like '\_backup%'
  loop
    execute format('drop table if exists backup_20261003.%I', t);
    execute format('create table backup_20261003.%I as table public.%I', t, t);
  end loop;
end $$;

-- Policy snapshot (to restore policies exactly as they were)
drop table if exists backup_20261003._policies;
create table backup_20261003._policies as
  select * from pg_policies where schemaname = 'public';

-- Function snapshot
drop table if exists backup_20261003._functions;
create table backup_20261003._functions as
  select p.proname, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f';

-- Verify: live vs backup row counts
select t.tablename,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::int as live,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from backup_20261003.%I', t.tablename), false, true, '')))[1]::text::int as backup
from pg_tables t
where t.schemaname = 'public' and t.tablename not like '\_backup%'
order by 1;
