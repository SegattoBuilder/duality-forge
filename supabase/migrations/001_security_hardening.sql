-- 001 — Security hardening (safe to run before any app change)
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent: safe to re-run.
-- Does NOT remove any policy, so the current production app keeps working.
--
--  1. Rating triggers run as SECURITY DEFINER (chapter/adversary averages were
--     never updated when rated by non-authors — RLS blocked the trigger's UPDATE)
--  2. import_count maintained by trigger on *_imports (client increment was
--     blocked by RLS for non-authors)
--  3. Clients can't write avg_rating / rating_count / import_count directly
--  4. characters: owner can't self-approve; DM can only change table_approved
--  5. get_table_names() RPC — replaces the open dm_tables SELECT (see 002)
--  6. Backfill ratings + import counts

-- ---------------------------------------------------------------------------
-- 1. Rating triggers
-- ---------------------------------------------------------------------------
create or replace function public.update_chapter_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_id uuid := coalesce(new.chapter_id, old.chapter_id);
begin
  update public.community_chapters set
    avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_chapter_ratings where chapter_id = target_id), 0),
    rating_count = (select count(*) from public.community_chapter_ratings where chapter_id = target_id)
  where id = target_id;
  return coalesce(new, old);
end $$;

create or replace function public.update_adversary_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_id uuid := coalesce(new.adversary_id, old.adversary_id);
begin
  update public.community_adversaries set
    avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_adversary_ratings where adversary_id = target_id), 0),
    rating_count = (select count(*) from public.community_adversary_ratings where adversary_id = target_id)
  where id = target_id;
  return coalesce(new, old);
end $$;

create or replace function public.update_homebrew_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_id uuid := coalesce(new.homebrew_id, old.homebrew_id);
begin
  update public.community_homebrew set
    avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_homebrew_ratings where homebrew_id = target_id), 0),
    rating_count = (select count(*) from public.community_homebrew_ratings where homebrew_id = target_id)
  where id = target_id;
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Import counters
-- ---------------------------------------------------------------------------
create or replace function public.update_import_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if tg_table_name = 'community_chapter_imports' then
    target_id := coalesce(new.chapter_id, old.chapter_id);
    update public.community_chapters set import_count =
      (select count(*) from public.community_chapter_imports where chapter_id = target_id) where id = target_id;
  elsif tg_table_name = 'community_adversary_imports' then
    target_id := coalesce(new.adversary_id, old.adversary_id);
    update public.community_adversaries set import_count =
      (select count(*) from public.community_adversary_imports where adversary_id = target_id) where id = target_id;
  elsif tg_table_name = 'community_homebrew_imports' then
    target_id := coalesce(new.homebrew_id, old.homebrew_id);
    update public.community_homebrew set import_count =
      (select count(*) from public.community_homebrew_imports where homebrew_id = target_id) where id = target_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_chapter_import_count on public.community_chapter_imports;
create trigger trg_chapter_import_count after insert or delete on public.community_chapter_imports
  for each row execute function public.update_import_count();

drop trigger if exists trg_adversary_import_count on public.community_adversary_imports;
create trigger trg_adversary_import_count after insert or delete on public.community_adversary_imports
  for each row execute function public.update_import_count();

drop trigger if exists trg_homebrew_import_count on public.community_homebrew_imports;
create trigger trg_homebrew_import_count after insert or delete on public.community_homebrew_imports
  for each row execute function public.update_import_count();

-- ---------------------------------------------------------------------------
-- 3. Counters are server-maintained only
--    current_user is 'authenticated'/'anon' for API calls, but the table owner
--    inside the SECURITY DEFINER triggers above — so those still work.
-- ---------------------------------------------------------------------------
create or replace function public.guard_community_counters()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.avg_rating   := old.avg_rating;
    new.rating_count := old.rating_count;
    new.import_count := old.import_count;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_counters on public.community_chapters;
create trigger trg_guard_counters before update on public.community_chapters
  for each row execute function public.guard_community_counters();

drop trigger if exists trg_guard_counters on public.community_adversaries;
create trigger trg_guard_counters before update on public.community_adversaries
  for each row execute function public.guard_community_counters();

drop trigger if exists trg_guard_counters on public.community_homebrew;
create trigger trg_guard_counters before update on public.community_homebrew
  for each row execute function public.guard_community_counters();

-- ---------------------------------------------------------------------------
-- 4. characters — table membership rules
--    table_approved values: null (none) | 'false' (pending) | 'true' | 'denied' | 'kicked'
--    - Owner: may join (table_id + 'false'), leave (table_id null), clear status.
--             May NOT set 'true'/'denied'/'kicked' unless they are that table's DM.
--    - DM of linked table (not owner): may ONLY change table_approved, to
--             'true' / 'denied' / 'kicked'. Can't touch data, user_id, table_id.
-- ---------------------------------------------------------------------------
create or replace function public.guard_character_membership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.table_approved = 'true' then
      new.table_approved := 'false';
    end if;
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then
    if (to_jsonb(new) - 'table_approved') is distinct from (to_jsonb(old) - 'table_approved') then
      raise exception 'Only the character owner can edit this character' using errcode = '42501';
    end if;
    if coalesce(new.table_approved, '') not in ('true', 'denied', 'kicked') then
      raise exception 'Invalid membership status' using errcode = '22023';
    end if;
    return new;
  end if;

  if (new.table_approved is distinct from old.table_approved or new.table_id is distinct from old.table_id)
     and new.table_id is not null
     and new.table_approved is distinct from 'false'
     and not exists (select 1 from public.dm_tables t where t.id = new.table_id and t.user_id = auth.uid()) then
    raise exception 'Only the table DM can approve members' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_membership on public.characters;
create trigger trg_guard_membership before insert or update on public.characters
  for each row execute function public.guard_character_membership();

-- ---------------------------------------------------------------------------
-- 5. Table name lookup for players (by exact id only — no listing)
-- ---------------------------------------------------------------------------
create or replace function public.get_table_names(ids uuid[])
returns table (id uuid, campaign_name text)
language sql stable security definer set search_path = '' as $$
  select t.id, t.campaign_name
  from public.dm_tables t
  where auth.uid() is not null
    and cardinality(ids) <= 50
    and t.id = any(ids);
$$;

revoke execute on function public.get_table_names(uuid[]) from public, anon;
grant  execute on function public.get_table_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Backfill (runs as table owner, so the counter guard doesn't apply)
-- ---------------------------------------------------------------------------
update public.community_chapters c set
  avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_chapter_ratings r where r.chapter_id = c.id), 0),
  rating_count = (select count(*) from public.community_chapter_ratings r where r.chapter_id = c.id),
  import_count = (select count(*) from public.community_chapter_imports i where i.chapter_id = c.id);

update public.community_adversaries a set
  avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_adversary_ratings r where r.adversary_id = a.id), 0),
  rating_count = (select count(*) from public.community_adversary_ratings r where r.adversary_id = a.id),
  import_count = (select count(*) from public.community_adversary_imports i where i.adversary_id = a.id);

update public.community_homebrew h set
  avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from public.community_homebrew_ratings r where r.homebrew_id = h.id), 0),
  rating_count = (select count(*) from public.community_homebrew_ratings r where r.homebrew_id = h.id),
  import_count = (select count(*) from public.community_homebrew_imports i where i.homebrew_id = h.id);
