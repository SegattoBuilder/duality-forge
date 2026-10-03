-- 001b — Missing defaults on chapter ratings/imports (applied 2026-10-03)
--
-- community_chapter_ratings.id and community_chapter_imports.id had no default,
-- so every chapter rating/import failed with "null value in column id".
-- Adversary and homebrew tables already had these defaults.
--
-- Rollback: same statements with `drop default` instead of `set default ...`.

alter table public.community_chapter_ratings
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

alter table public.community_chapter_imports
  alter column id set default gen_random_uuid(),
  alter column imported_at set default now();
