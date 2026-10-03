# TODO — Duality Forge <img src="images/logo/icon-192.png" alt="logo" width="48">

## ✅ Completed

### Project Structure
- [x] Merged DM tools + character sheet into monorepo
- [x] Consolidated character sheet to single layout
- [x] Consolidated nav actions into kebab menu (DM + character)
- [x] Moved support to shared page, merged character nav into single row
- [x] Split gear and auth into separate nav buttons
- [x] Centralized magic numbers and localStorage keys into constants.js

### Branding & Polish
- [x] New logo and icons
- [x] Project name update (Duality Forge)
- [x] Tab persistence, collapse arrows, support link
- [x] Swap fantasy tab icons (scroll→story, book→compendium)

### Themes & UI Components
- [x] Extracted shared theme module (`js/core/theme.js`) — both DM and Character use same `dh_theme` / `dh_mode` keys
- [x] Removed per-character theme override from cloud save (shared global preference)
- [x] Sci-Fi mode CSS — navy-black palette, scan-line texture, squared corners, steel blue borders
- [x] Fantasy mode CSS — warm browns, amber/copper tones, heavier vignette, cracked stone texture
- [x] Button component class system — 17+ semantic classes (`btn-primary`, `btn-secondary`, `btn-danger`, `btn-nav`, `btn-icon`, `mode-btn`, `menu-item`, `picker-card`, etc.)
- [x] Structural component classes — `input-field`, `input-search`, `select-field`, `dropdown-menu`, `stat-box`, `vitals-row`, `panel-box`, `gear-slot`, `gear-input`, etc.
- [x] Replaced ~175 inline Tailwind instances across HTML and JS with semantic classes
- [x] All 4 mode overrides (dark/light/scifi/fantasy) for every component class in `themes.css`
- [x] Fixed vitals/stat box dark backgrounds bleeding into light mode
- [x] Browser autofill styling fix across all themes
- [x] Darkened `text-zinc-500` / `text-zinc-600` globally in `base.css` for readability; light mode overrides in `themes.css`

### Compendium & Cards
- [x] Weapons, Armor, Items, Consumables can be added to character sheet from compendium
- [x] All cards in compendium have option to be added to character sheet
- [x] Card collapse, custom styled dialogs

### DM Vault & Groups
- [x] Group options with Deploy All for DM in Vault
- [x] New Character option for DM and Sheet, removed all clear sheet
- [x] Vault clear includes groups, adversary +Add feedback, disposable default on

### Cloud Sync & Storage
- [x] RLS cloud sync
- [x] Landing page auth flow, DM Table with Party option
- [x] Cloud autosave system, unified cloud picker
- [x] Consent on signup, DM nav redesign, title toggle

### Authentication & Account Management
- [x] Password reset from Profile (email users only)
- [x] Forgot password on Sign In modal
- [x] Hide password reset for Google OAuth users
- [x] Change email address
- [x] Session management (sign out from all devices)
- [x] Sign-out redirects to `/` instead of resetting UI in place
- [x] Sign out option on landing page
- [x] Delete account (confirmation modal, cascade cleanup of characters, tables, profile)
- [x] Analytics snapshot on account deletion

### Party System
- [x] Table Party setup (DM creates table, shares code)
- [x] DM and player table linking, DM approval flow
- [x] DM read-only access to party members' character data
- [x] Sign-in gate on Party tab for logged-out users
- [x] Profile DM and Player experience standardized options
- [x] Handle DM table deletion gracefully for linked characters
- [x] Auto-save syncs table approval status (15-min cycle)
- [x] Forced campaign/character picker (no dismiss, back to forge link)

### Legal & Analytics
- [x] Terms/privacy pages, consent gate, updated how-to-use docs
- [x] Google verification, updated analytics
- [x] Cloudflare Web Analytics integration

### Community (`/community/`)

**Platform & Page**
- [x] Landing page card, nav header (logo left, `modern-tab-btn` tabs center, auth right)
- [x] Theme/mode support — initializes saved display mode and accent color on load
- [x] Auth — sign-in required; avatar hidden when signed in; sign-in button when logged out
- [x] Escape/Enter key handling across all 3 pages
- [x] Encoding fix — 29 double-encoded UTF-8 characters in community app.js
- [x] Project rules — `.amazonq/rules/project-rules.md`

**Database**
- [x] Triplet DB pattern — each content type gets 3 tables: `community_{type}`, `community_{type}_ratings`, `community_{type}_imports`
- [x] Renamed: `community_ratings` → `community_chapter_ratings`, `community_imports` → `community_chapter_imports`
- [x] `community_chapters`, `community_chapter_ratings`, `community_chapter_imports` tables with RLS, indexes, CASCADE deletes
- [x] `community_adversaries`, `community_adversary_ratings`, `community_adversary_imports` tables with RLS, indexes, CASCADE deletes
- [x] Auto-updated `avg_rating` trigger (per content type)
- [x] Explicit GRANTs for raw-SQL tables (`anon`, `authenticated`, `service_role`)
- [x] Account deletion — shared content anonymized; imported copies unaffected
- [x] Legal — Terms of Use Section 5 (Community Sharing)

**Chronicle Sharing**
- [x] Share from Chronicle — metadata modal, consent gate, all-fields-required validation
- [x] Browse tab — search, filter, sort, preview modal, star rating, import to Chronicle
- [x] My Shares tab — edit (Quill + NPCs + music + metadata), delete, stats
- [x] Version system — auto-increments on content change; metadata-only edits don't bump
- [x] Duplicate prevention — same author can't share two chapters with the same title
- [x] Import flow — always creates new chronicle entry with version in title; toast confirmation
- [x] Import update notifications — dismissible version-aware badge; reappears on newer version
- [x] Duration options — Short, Medium, Long, Extra Long
- [x] Chapter card styling — `compendium-card` with accent border
- [x] Quill theme overrides + toolbar stacking fix

**Community Layout Rework**
- [x] Nav tabs expanded: 📜 Chapters, 👹 Adversaries, 🧪 Homebrew, 📤 My Shares
- [x] Browse Homebrew tab with "Coming Soon" placeholder
- [x] My Shares grouped into sections: Chapters, Adversaries, Homebrew (Coming Soon)

**Adversary Sharing**
- [x] Share custom adversaries from Vault — share button (↪) on vault cards when signed in + has enemyData + has nickname + not SRD
- [x] SRD share prevention — hide share button when creature name matches SRD adversary
- [x] Share modal — title, description (3+ words), consent checkbox, duplicate prevention, preview badges
- [x] Browse community adversaries — search, filter (tier min-max, difficulty min-max, type dropdown, sort), preview modal with full detail
- [x] Add to vault — imports adversary as creature with enemyData, tracks unique imports via `community_adversary_imports`
- [x] Rating system — 1–5 stars, one per account, updates avg_rating via trigger
- [x] My Shares adversary section — edit (title, description), delete, stats
- [x] Nickname required for sharing — blocks with alert if no profile.nickname
- [x] Nickname sync on change — `saveProfile()` batch-updates `author_nickname` on `community_chapters` and `community_adversaries`
- [x] `author_nickname` only uses `profile.nickname` — no fallback to Google display name or email

**DM Tracker/Vault Refinements**
- [x] Tier field added to Custom modal (number input, 1-4)
- [x] Type and Tier shown as separate badges (was combined "Type • TX")
- [x] Difficulty/Evasion moved to badge row — removed +/- inline adjustment (edit via ✏️ instead)
- [x] Vault edit re-render fix — detect vault creatures (`v-{id}` prefix) and call `renderVaultGrid()` instead of `renderCard()`

**Homebrew Cards**
- [x] `community_homebrew`, `community_homebrew_ratings`, `community_homebrew_imports` tables (SQL + RLS + GRANTs + rating trigger)
- [x] Table constants in `constants.js`
- [x] Create card flow on Character Sheet — ✦ Create button in Cards tab, pick type (Domain Card / General), fill fields, add repeatable features
- [x] Edit homebrew cards — ✏️ button on `_homebrew` cards, edit all fields + features in modal
- [x] Share homebrew cards — ↪ button on `_homebrew` cards, title + description (3+ words) + consent, publishes to `community_homebrew`
- [x] Browse tab — search, filter (card type, category, domain), sort, preview modal, star rating
- [x] Import to character sheet — card_data matches `addCardToSheet` shape, `_homebrew` flag stripped so imported cards don't show edit/share buttons
- [x] My Shares homebrew section — edit (title, description, card fields, features), delete, stats
- [x] Homebrew guidelines modal — ℹ️ info button in My Shares with Daggerheart-specific advice
- [x] Nickname sync on change covers `community_homebrew`
- [x] Account deletion — anonymize homebrew rows + delete ratings/imports (all 3 content types)

**Community UX**
- [x] Replaced all browser `alert()` / `confirm()` with themed toasts and confirm modal
- [x] Stripped UTF-8 BOM from `js/community/app.js`
- [x] Sign-in gate — all community tabs show lock screen when logged out, no data loaded
- [x] Removed nav Sign In button (gate handles auth flow)

**Branding — Forge Theme**
- [x] Landing page tool cards renamed: DM Tools → The Anvil, Character Sheet → The Crucible, Community → The Fireside
- [x] Forge-themed descriptions and icons (⚒️ 🗡️ 🔥)

**Character Sheet — Story Tab**
- [x] Tier 2/3/4 level-up cards with checkbox options, wired to `autoCache()`
- [x] Tier cards moved to top row in 3-column responsive grid
- [x] Collapsible toggle on all Story tab cards (tiers, description, connections, level up notes, backstory)
- [x] Dynamic nav spacer — `ResizeObserver` syncs spacer height to nav, replaces hardcoded top margins

### Code Refactoring
- [x] Extract `escHtml` / `escHtmlAttr` to `js/core/utils.js` — single source of truth, removed re-export chains through `auth.js` → `app.js` → everywhere (13 files updated)
- [x] Deduplicate `computeDotToggle` / `computeDotTarget` — identical function in `tracker-logic.js` and `trackers-logic.js`, consolidated into `utils.js`
- [x] Deduplicate `validateShareFields` / `validateShareAdvFields` — same logic in `cards-logic.js` and `vault-logic.js`, consolidated into `utils.js`
- [x] Extract `generateId(prefix)` — the `'c-' + Date.now() + '-' + Math.random()…` pattern repeated in 8 places, consolidated into `utils.js`
- [x] Add tests for `escHtml` / `escHtmlAttr` in `utils.js` — 24 tests covering `escHtml` bold regex, `escHtmlAttr`, `generateId`, `computeDotToggle`, `validateShareFields`
- [x] Split `community/app.js` into `app.js` + `community-logic.js` — extracted `renderStars`, `parseFeatureText`; replaced inline `esc()` with `escHtml` from `utils.js`
- [x] Move `getToastStyles` from `save-logic.js` to `theme.js` — UI/theme concern, not save logic

---

## 🔜 Planned

**Dashboard (`epic/dashboard`)**
- [x] Dashboard view — signed-in users see all saves (tables + characters) on landing page
- [x] Horizontal scrollable card rows per section, newest first
- [x] Save picker modal — click card to load, with delete and archive options
- [x] Character cards show linked table name
- [x] "+ New" button — creates clean character or table, clears cached data
- [x] Upload button — auto-detects character vs table JSON, creates row
- [x] Profile modal on dashboard — view and edit profile directly
- [x] Dashboard card navigation — clicking a card loads save directly in character/DM app
- [x] Persist `currentCharacterRowId` in localStorage — saves update existing row on reload
- [x] Sign out clears character row ID
- [x] Remove profile/save-management from character/DM auth menus (cleanup)
- [x] Character name not set when creating new character from dashboard (applyCharacterRow needs to read `character_name` when `data` is empty)
- [x] DM equivalent of `LS_CHAR_ROW_ID` — persist current table row ID
- [x] Auth gate — `/dm/`, `/character/`, `/community/` require Supabase session; direct URL without localStorage redirects to dashboard
- [x] Round avatar profile button — shows saved avatar → Google photo → 👤 fallback; `referrerpolicy="no-referrer"` for Google images
- [x] Mode picker buttons keep dark-mode styling across all display modes (emoji colors always visible)
- [x] Unified save button — merged `#syncStatus` + `#saveBtn` into single cloud icon; swaps to cloud-check on save/autosave; fantasy mode shows crown with golden glow

**Autosave Schema Refactor (merged to main)**
- [x] `autosave_data` + `autosave_at` columns on `characters` and `dm_tables`
- [x] Autosave writes to same row instead of separate `is_autosave` rows
- [x] Cloud picker reads autosave from same row
- [x] Migrated existing autosave data, promoted orphans, cleaned up old rows
- [x] Removed all `is_autosave` references from JS code
- [x] Backup tables (`_backup_characters_autosave`, `_backup_dm_tables_autosave`) retained

**Unsaved Changes Guard & Autosave Simplification**
- [x] `beforeunload` dirty check — warns on tab close or navigation when unsaved changes exist (DM + Character)
- [x] Autosave writes to main `data` column instead of `autosave_data` — single source of truth
- [x] Removed autosave picker from dashboard and cloud picker (single save per row)
- [x] Snapshot uses `gatherDmData()` / `gatherData()` consistently so dirty check matches after save and load
- [ ] DB cleanup — drop `autosave_data` / `autosave_at` columns (deferred, columns unused but still in schema)

**Promoted DB Columns & Dashboard Performance**
- [x] `class`, `level` columns on `characters`; `creature_count`, `vault_count`, `chronicle_count` on `dm_tables`
- [x] Dashboard fetches promoted columns instead of full `data` blobs — archived detail view fetches on demand
- [x] Cloud save and autosave write promoted columns alongside `data`
- [x] Party summary reads `level` and `class` from promoted columns instead of `data` blob

**Character Sheet — Level Stepper**
- [x] Level input replaced with −/+ stepper (readonly, min 0, max 99)
- [x] DB `level` column as INT, backfilled existing rows

**Dashboard — Archive**
- [x] Archive tab on dashboard — soft-archive tables and characters with `archived_at` timestamp
- [x] Archive/unarchive from save picker, read-only detail view for archived saves
- [x] Archive count badge on tab

**Party**
- [x] Party summary two-column layout (Party / Group), centered title, DC difficulty target badge
- [x] Party reads from promoted columns instead of character `data` blobs

**Bug Fixes**
- [x] Chronicle chapter toggle — fixed Quill instance lifecycle on re-render
- [x] New character from dashboard loading stale data — skip localStorage when `dh_dashboard_pick` is pending
- [x] Party tier always showing Tier 1 — was reading from stale `data` blob instead of promoted `level` column
- [x] Copy table code feedback — brief checkmark on clipboard copy

**Code Cleanup**
- [x] Removed dead `dh_dashboard_new` flow — all navigation uses `dh_dashboard_pick`
- [x] `LS_DM_VAULT_COLLAPSED` confirmed active — used in `vault.js` for group collapse state

**Quick UX Wins**
- [x] Compendium + adversaries search — require min 3 characters before searching (filters still work immediately)
- [x] Dashboard local cache update after mutations — archive/unarchive/delete/upload mutate cached arrays locally instead of refetching

**PWA**
- [x] `manifest.json` with dark background, 4 icon variants (192+512 × any+maskable), service worker
- [x] `<meta name="theme-color">` + `<link rel="manifest">` on all pages
- [ ] Test PWA install on production after merge to main (preview branch may not support install)

**Table Board** ← _next epic_
- [ ] Shared board per DM table — DM and players can post notes, schedule, table rules, session recaps

---

## 🔍 Code Review Findings (2026-10)

_Full review of security, correctness, performance and structure. Ordered by priority. Items already in the Performance backlog below are not repeated._

**P0 — Security (cross-user XSS → session token theft from localStorage)**
- [x] Fix escapers in `utils.js` — single `escapeHtml` covering `& < > " '`; move `**bold**` formatting out of the escaper into `formatInline`; update `utils.test.js` (currently locks in unsafe behavior)
- [x] Vendor DOMPurify — sanitize rich text: community chapter `content.text` (`community/app.js:332`), homebrew `desc`/`feature`, card `feature` in `cards.js` and `character-detail.js`
- [x] Escape all community chapter fields — `disposition`, NPC/music fields (`community/app.js:324-340`); `environment`/`difficulty`/`duration` already enum-constrained in DB but escape anyway
- [x] Escape music cue `href` and avatar `src` attributes (`community/app.js:351`, `dashboard.js:446,503`)
- [x] Escape creature/card/gear names rendered via `innerHTML` (`tracker.js:523,535`, `vault.js:131,170`, `cards.js:165,199-212`, `gear.js` input values)
- [x] `showConfirm` / `showAlert` use `textContent` only (`auth.js:298`); callers passing markup switch to plain text
- [x] Chronicle load via `quill.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(html))` instead of `quill.root.innerHTML` (`chronicle.js:132`)
- [x] Inline handler args escaped with `escJs` (party deny/kick, vault groups, creature ids)
- [ ] Remove data interpolation inside inline `onclick="fn('${x}')"` — party deny/kick (`party.js:68,70`) is exploitable by a player's character name; migrate to `data-*` + delegated listeners
- [x] Pin third-party script versions + `integrity` (SRI); add `/_headers` with CSP (`connect-src 'self' *.supabase.co`)

**P0 — Supabase RLS / DB** _(SQL in `supabase/migrations/` — run manually in SQL Editor)_
- [x] **Run `001_security_hardening.sql`** (applied 2026-10-03, snapshot `backup_20261003`) — safe before app deploy:
  - Rating triggers `SECURITY DEFINER` (chapter/adversary averages never updated for non-author ratings) + backfill
  - `import_count` maintained by trigger on `*_imports` (client increment blocked by RLS) + backfill
  - Guard trigger: clients can't write `avg_rating` / `rating_count` / `import_count`
  - `characters` guard: owner can't self-approve; DM can only change `table_approved` (was able to rewrite player `data` and `user_id`)
  - `get_table_names(ids)` RPC for players
- [x] **Run `001b_chapter_id_defaults.sql`** (applied 2026-10-03) — chapter ratings/imports were failing: `id` had no default
- [ ] Drop `backup_20261003` and `backup_20261003_b` schemas after ~1 week without issues (2026-10-10)
- [x] **Run `002_close_dm_tables_read.sql`** (applied 2026-10-03 after main deploy, snapshot `backup_20261003_b`; verified: signed-in user sees only own tables) — ONLY after app using `get_table_names()` is live on main. Closes `dm_tables` SELECT `using(true)` (all campaigns readable with anon key) + removes duplicate policies
- [ ] `author_nickname` set server-side from `profiles` (prevents impersonation)
- [ ] `*_imports` / `*_ratings` public read exposes who imported/rated what — restrict to own rows if counts are enough
- [ ] `characters.table_approved` is `text` with values `null/'false'/'true'/'denied'/'kicked'` — convert to enum or add CHECK
- [ ] Drop `_backup_*_autosave` tables + `autosave_data`/`autosave_at`/`is_autosave` columns once confirmed unneeded
- [ ] Policies: wrap `auth.uid()` as `(select auth.uid())` (Supabase perf recommendation)
- [ ] Full schema dump into repo (`supabase/schema.sql`)
- [x] Verified: RLS enabled on all tables (backups have no policies → inaccessible); `profiles` owner-only; rating CHECK 1–5 exists; chapter environment/difficulty/duration enum CHECKs exist

**P0 — Cloudflare Functions**
- [x] `/api/report` — rate limit (Cloudflare rule or Turnstile), `type` allowlist, truncate fields, reject bodies > 4KB (protects KV free-tier writes)
- [x] `/api/reports` — admin key via header (not query string) + constant-time compare, or put behind Cloudflare Access
- [ ] `delete-account.js` — check intermediate fetch results before deleting the auth user

**P1 — Data loss / correctness**
- [ ] Save conflict detection — update with `.eq('updated_at', loadedTs)`; 0 rows → "cloud is newer: keep mine / take theirs"
- [x] Autosave snapshot set only after successful save (`char-auth.js:98`, `dm-auth.js:94`) — failed saves currently never retry
- [x] In-flight save lock — double-click Save before row exists creates duplicate rows
- [x] DM autosave drops `partyMembers` that manual save includes (`dm-auth.js:109-148`)
- [x] Deleting the currently loaded row from cloud picker leaves stale row ID → silent data loss
- [x] `safeJson(key, fallback)` helper — corrupt `dh_sheet` bricks the character sheet (`save.js:146`)
- [x] Character `app.js` — register `DOMContentLoaded` before `await requireAuth()` (init can be missed)
- [x] DM gear menu throws on every click — `#authMenu` doesn't exist (`dm-auth.js:240`); remove ~130 dead lines (190-318, 372-401)
- [x] Rate-limit cooldown shows raw HTML and never ticks (`auth.js:310` → `showAlert` uses `textContent`)
- [ ] Dashboard archive/unarchive/delete update UI even when write fails (`dashboard.js:333-350`)
- [ ] Community imports write directly to other pages' localStorage keys with hardcoded strings — use constants + `storage` listener or pending-import queue
- [ ] Global `unhandledrejection` + `onerror` reporting on all pages (currently only support page)
- [ ] Define `window._markCloudDirty` (called in `vault.js:26`, `chronicle.js:16`, never defined) — or replace with dirty flag in CloudSync

**P1 — Bugs found during 2026-10-03 maintenance window**
- [x] Switching DM campaigns (open old → create new / go back) shows the previous campaign's data until refresh — risk of saving wrong data into a campaign. Check bfcache (`pageshow` persisted) and localStorage-before-pick load order
- [x] Kicked/denied player isn't told on load — only after 15-min autosave runs `refreshTableApproval`; `loadLinkedTable(..., 'kicked')` may treat status as approved (`approved || false`). Run approval check on sheet load
- [ ] Community homebrew — "create card" button missing (create/share currently only from character sheet?)

**P1 — Supabase egress / free tier**
- [x] Single Supabase client via `getSupabase()` — 4 clients today (`auth.js`, `auth-gate.js`, `index.html`, `community/app.js`) race on token refresh → random sign-outs
- [x] `setUser` — no-op when user id unchanged; merge multiple `onAuthChange` registrations per page
- [x] Community `onAuthStateChange` — ignore `INITIAL_SESSION` / `TOKEN_REFRESHED` (currently loads everything twice + hourly)
- [x] Cloud picker — `select('id, updated_at, name')`, fetch `data` only for the picked row (`auth.js:276`)
- [ ] Community lists — select card columns only, fetch full content on open
- [x] DM save — `select('character_name, class, level')` instead of full `data` (`dm-auth.js:144`); `.insert().select('id, campaign_name')`
- [x] `setCurrentTable` — persist `{id, campaign_name}` only, not full row (`party.js:9`)
- [ ] Dashboard — `Promise.all` independent queries; reuse `getProfile()`
- [ ] Adversaries cache — add TTL/version (never refreshes today); build SRD name `Set` once (`vault.js:166`)
- [ ] `cards.js` — reuse compendium's in-memory data instead of refetching GitHub files
- [x] Save on `visibilitychange → hidden` when dirty (phones rarely fire `beforeunload`); `pagehide` instead of `beforeunload` for bfcache

**P1 — Mobile performance**
- [x] Debounce `autoCache` 300–500ms; skip search inputs; remove duplicate per-field calls (`character/app.js:124`, `gear.js:174`)
- [ ] Debounce chronicle/tracker notes caching; chronicle re-renders only the changed chapter, keeps Quill instances
- [ ] Tracker dot click — toggle classes instead of re-rendering whole card
- [ ] `gear.js` `autoResizeTextareas` — listeners added on every expand (leak); bind once or use `field-sizing: content`
- [ ] Vault drag-scroll — `requestAnimationFrame` loop instead of 16ms `setInterval` per `dragover`
- [ ] Touch reorder — HTML5 drag & drop doesn't work on phones; pointer events or up/down buttons
- [x] Remove `backdrop-blur` on nav and modal overlay (or desktop-only)
- [x] `.domain-card-selected` infinite `box-shadow` animation → animate `opacity` on pseudo-element
- [x] Fantasy mode `filter: drop-shadow` on every dot → single cheap shadow
- [ ] ~~Replace fixed full-screen `feTurbulence` noise~~ — re-evaluated: rasterized once and cached, low cost; keep
- [x] `defer` supabase-js; Quill 2 on both DM + community (community uses 1.3.7 — HTML incompatibility); lazy-load Quill on first chronicle/share open
- [x] `/_headers` cache rules (images/fonts long, js/css short + revalidate); service worker stale-while-revalidate for same-origin assets
- [x] Fix stale Cinzel preload (`v23` → current); drop unused Inter 300/800 weights; consistent `display=swap`
- [ ] Compress `icon-512` / `logo.png` PNGs (~300KB each)

**P1 — SRD data source migration** _(to discuss)_
- [ ] Current sources: compendium + cards use `daggersearch/daggerheart-data` (last updated 2025-08 — stale); adversaries use `seansbox/daggerheart-srd` (last updated 2026-01)
- [ ] Evaluate new, better-maintained source (more structured data); confirm license/terms (SRD is under the Darrington Press Community Gaming License)
- [ ] Single data adapter module (`js/core/srd.js`) — one place maps source format → app format, so swapping sources doesn't touch compendium/cards/tracker
- [ ] Pin source to a commit/tag instead of `main` (upstream changes can't silently break the app); cache-first with version key
- [ ] Decide: fetch from third party at runtime vs. own copy (Cloudflare Pages `/data/` preferred over Supabase Storage — unlimited free bandwidth, edge-cached; Supabase egress is shared with auth/saves). ~560KB raw / ~100KB gzipped
- [ ] Owner to check Darrington Press Community Gaming License terms before hosting a copy — **deferred, dedicated branch** (decided 2026-10-03)
- [ ] Interim (perf batch): pin current sources to a commit SHA + cache-first on device

**P2 — Structure & cleanliness**
- [ ] `core/cloud-sync.js` — `createCloudSync({ table, nameColumn, gather, apply, toRow })` replaces duplicated logic in `dm-auth.js` / `char-auth.js` (~180 lines); home for P1 save fixes
- [ ] `core/dialog.js` (native `<dialog>`, Promise-based confirm/alert/prompt) + `core/toast.js` — replaces ~8 dialog and 4 toast implementations
- [ ] `data-action` event delegation module-by-module — removes 229 `window.*` globals and ~350 inline handlers
- [ ] `community/app.js` — `communityResource()` factory for chapters/adversaries/homebrew; split files; use core auth
- [ ] `dm/creature-card.js` — shared card rendering for tracker + vault
- [ ] Split `dashboard.js` (cards / save-picker / account / menus) and `tracker.js`
- [ ] Break circular imports (`tracker.js` / `dm-auth.js` ↔ `dm/app.js`) — move keys to `constants.js`
- [ ] Move character modals into `<template>` / render on first open; shared SVG sprite for save icons
- [ ] CSS tokens — ~15-20 custom properties per mode (`--surface-*`, `--text-*`, `--border`); target `themes.css` 80KB → ~20KB, drop `!important`; replace hardcoded `#d4a017` with `var(--accent-1)`
- [ ] Delete `js/character/theme.js` re-export; stop saving `theme` in `gatherData`; `signOut` shouldn't clear `dh_theme`
- [ ] Remove unused exports/globals (`cloudSaveRow`, `hasConsent`, DM `saveSession`/`loadSession`/`newCampaign`/`clearAll`)
- [x] `cloud-picker.js` — show load errors as errors, not "No saves found"
- [ ] README — autosave interval says 5 min, code is 15 min

**P3 — Tests**
- [x] Escaper tests with quote/apostrophe/attribute payloads
- [ ] CloudSync tests with fake Supabase (stale `updated_at`, failed save stays dirty, no double insert)
- [ ] `safeJson` tests; Pages Functions tests with mocked `fetch`/env
- [ ] Static check: every inline `on*=` handler name is defined and every `getElementById` id exists on the page

---

## ⚡ Performance & Optimization (Backlog)

_Identified improvements — not urgent at current scale (~30 users), but good practice to address as the app grows._

**Data Loading**
- [x] Community filter debounce — 200ms debounce on text search inputs (chapters, adversaries, homebrew)
- [x] Compendium search optimization — min 3 chars before searching; stable `_idx` on items replaces O(n) `indexOf()` lookups
- [x] Compendium card index — stable `_idx` assigned during preprocessing; no more `indexOf()` O(n²) lookups
- [ ] Community pagination — `select('*')` loads all chapters/adversaries/homebrew unbounded; add `range()`/pagination and server-side filtering
- [x] Dashboard metadata-only fetch — promoted columns (`class`, `level`, `creature_count`, etc.) replace full `data` blob fetch
- [ ] Compendium cache-first loading — read localStorage/IndexedDB cache before fetching 10 remote JSON files; add version + expiration
- [ ] Combine compendium JSON — merge 10 separate category files into a single compressed asset
- [ ] Event delegation — replace per-card click handlers (dashboard cards, carousel arrows) with delegated container handlers using `data-*` attributes

**Dashboard**
- [x] Local cache update after mutations — archive/unarchive/delete/upload update cached arrays locally and re-render without refetching
- [x] Row lookup Map — `Map` keyed by row ID replaces `rows.find()`

**Storage & Memory**
- [ ] IndexedDB for growing collections — community imports parse/rewrite full localStorage arrays synchronously; move to IndexedDB for larger collections


**CSS & Assets**
- [ ] Lazy-load theme stylesheets — `themes.css` is ~80KB with repeated rules; split per-mode and load on demand
- [x] Self-host Tailwind — replace CDN runtime with built/minified output for production
- [ ] Font optimization — `font-display: swap`, preload only critical fonts, defer non-critical assets
- [ ] Reduced-motion support — disable decorative SVG backgrounds, drop shadows, and animations under `prefers-reduced-motion`

**Bug/Correctness**
- [x] Compendium input listener duplication — `loadCompendium()` adds a new input listener every call; guarded with `_searchWired` flag

---

## 💡 Ideas / Someday

_Brainstorm space — no commitment, just possibilities._

- **Separate `/dashboard/`** — `/` becomes a public landing page (features, screenshots, SEO) and the app lives at `/dashboard/`. Not needed for the sign-in flash (fixed); costs one redirect for returning users. Pairs well with the Tailwind build (both touch every page)

- **Community Discovery** — contextual "Browse Community" links from Compendium/Adversary tabs; optional toggle to show community homebrew alongside SRD data
- **Table Scheduling** — DM sets a session schedule, players and DM receive email reminders _(high effort — requires email infrastructure)_
- **Companion/Pet Tracker** — HP, abilities, notes on character sheet
- **Font Size System** — CSS custom properties (`--text-micro`, `--text-label`, `--text-small`, `--text-body`, `--text-title`, `--text-hero`) to standardize sizes across components; replace hardcoded values in `components.css` first, then Tailwind inline classes gradually
- **Character Portrait** — optional avatar/image URL on the character sheet; could show in nav bar or dashboard card for visual recognition between saves; likely low usage during actual play
