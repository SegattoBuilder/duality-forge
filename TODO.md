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
- [ ] Add tests for `escHtml` / `escHtmlAttr` in `utils.js` — `escHtml` has hidden `**bold**` → `<strong>` regex, currently untested
- [ ] Split `community/app.js` into `app.js` + `community-logic.js` — only module not following the `-logic.js` split pattern
- [ ] Move `getToastStyles` from `save-logic.js` to `theme.js` — UI/theme concern, not save logic

---

## 🔜 Planned

**Table Board** ← _next_
- [ ] Shared board per DM table — DM and players can post notes, schedule, table rules, session recaps

---

## 💡 Ideas / Someday

_Brainstorm space — no commitment, just possibilities._

- **Account Linking** — link Google account to existing email account (or vice versa) to unify data under one identity
- **Community Discovery** — contextual "Browse Community" links from Compendium/Adversary tabs; optional toggle to show community homebrew alongside SRD data
- **Table Scheduling** — DM sets a session schedule, players and DM receive email reminders _(high effort — requires email infrastructure)_
- **Companion/Pet Tracker** — HP, abilities, notes on character sheet
