-- Rollback for 001_security_hardening.sql
--
-- Puts functions/triggers back exactly as they were before 001 and restores
-- community rating/import counters from the snapshot.
-- 001 never modified characters / dm_tables / profiles data, so nothing to restore there.

-- New triggers + functions
drop trigger if exists trg_guard_membership       on public.characters;
drop trigger if exists trg_guard_counters         on public.community_chapters;
drop trigger if exists trg_guard_counters         on public.community_adversaries;
drop trigger if exists trg_guard_counters         on public.community_homebrew;
drop trigger if exists trg_chapter_import_count   on public.community_chapter_imports;
drop trigger if exists trg_adversary_import_count on public.community_adversary_imports;
drop trigger if exists trg_homebrew_import_count  on public.community_homebrew_imports;

drop function if exists public.guard_character_membership();
drop function if exists public.guard_community_counters();
drop function if exists public.update_import_count();
drop function if exists public.get_table_names(uuid[]);

-- Original rating functions (as exported 2026-10-03)
create or replace function public.update_adversary_rating()
returns trigger language plpgsql security invoker as $function$
BEGIN
  UPDATE community_adversaries SET
    avg_rating = (SELECT coalesce(avg(rating), 0) FROM community_adversary_ratings WHERE adversary_id = coalesce(NEW.adversary_id, OLD.adversary_id)),
    rating_count = (SELECT count(*) FROM community_adversary_ratings WHERE adversary_id = coalesce(NEW.adversary_id, OLD.adversary_id))
  WHERE id = coalesce(NEW.adversary_id, OLD.adversary_id);
  RETURN NEW;
END;
$function$;
alter function public.update_adversary_rating() reset search_path;

create or replace function public.update_chapter_rating()
returns trigger language plpgsql security invoker as $function$
BEGIN
  UPDATE community_chapters SET
    avg_rating = (SELECT coalesce(avg(rating), 0) FROM community_chapter_ratings WHERE chapter_id = coalesce(NEW.chapter_id, OLD.chapter_id)),
    rating_count = (SELECT count(*) FROM community_chapter_ratings WHERE chapter_id = coalesce(NEW.chapter_id, OLD.chapter_id))
  WHERE id = coalesce(NEW.chapter_id, OLD.chapter_id);
  RETURN NEW;
END;
$function$;
alter function public.update_chapter_rating() reset search_path;

create or replace function public.update_homebrew_rating()
returns trigger language plpgsql security definer as $function$
DECLARE
    target_id UUID;
BEGIN
    target_id := COALESCE(NEW.homebrew_id, OLD.homebrew_id);
    UPDATE public.community_homebrew SET
        avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.community_homebrew_ratings WHERE homebrew_id = target_id), 0),
        rating_count = (SELECT COUNT(*) FROM public.community_homebrew_ratings WHERE homebrew_id = target_id)
    WHERE id = target_id;
    RETURN COALESCE(NEW, OLD);
END;
$function$;
alter function public.update_homebrew_rating() reset search_path;

-- Restore counters from snapshot (change schema name if your snapshot date differs)
update public.community_chapters c set avg_rating = b.avg_rating, rating_count = b.rating_count, import_count = b.import_count
  from backup_20261003.community_chapters b where b.id = c.id;
update public.community_adversaries c set avg_rating = b.avg_rating, rating_count = b.rating_count, import_count = b.import_count
  from backup_20261003.community_adversaries b where b.id = c.id;
update public.community_homebrew c set avg_rating = b.avg_rating, rating_count = b.rating_count, import_count = b.import_count
  from backup_20261003.community_homebrew b where b.id = c.id;
