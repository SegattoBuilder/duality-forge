# Database Change Runbook

All SQL runs manually in **Supabase Dashboard → SQL Editor** (paste whole file → Run).

## Every change

1. **Snapshot** — run `backup/snapshot.sql` (creates a new timestamped `backup_YYYYMMDD_HHMI` schema).
   Check the final result: `live` = `backup` for every table.
2. **Apply** the migration.
3. **Smoke test** (checklist below).
4. Problem? Run the matching `*_rollback.sql`, then report the error message.
5. After ~1 week without issues: `drop schema backup_YYYYMMDD cascade;` (free tier = 500MB).

## 001 — Security hardening (no app deploy needed)

Low risk: adds rules + recalculates community counters. Doesn't modify character/table data.

Smoke test (on live site):
- [ ] Character sheet: edit + cloud save works
- [ ] DM: save campaign works
- [ ] Player links character to a table → shows pending
- [ ] DM approves, denies, kicks → each works
- [ ] Rate someone else's chapter/adversary → average updates
- [ ] Import chapter/adversary/homebrew → count goes up
- [ ] Dashboard loads, linked table names show

Rollback: `migrations/001_rollback.sql`

## 002 — Close public dm_tables read (needs app deploy first)

Order matters:
1. Merge `dev` → `main` (app uses `get_table_names()`), wait for Cloudflare deploy.
2. Snapshot.
3. Run `002_close_dm_tables_read.sql`.

Smoke test:
- [ ] Player dashboard shows linked table names
- [ ] Player links to a table with code → finds it
- [ ] DM opens campaign + party list
- [ ] Signed out: `https://<project>.supabase.co/rest/v1/dm_tables?select=id` with anon key returns `[]`

Rollback: `migrations/002_rollback.sql`

## Full data restore (last resort)

Only if data itself got damaged. Restores one table from snapshot — anything saved
after the snapshot in that table is lost. Ask before using.

```sql
begin;
-- example: characters
delete from public.characters;
insert into public.characters select * from backup_YYYYMMDD.characters;
commit;
```
