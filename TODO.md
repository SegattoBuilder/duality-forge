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
- [x] `community_chapters`, `community_ratings`, `community_imports` tables with RLS, indexes, CASCADE deletes
- [x] Auto-updated `avg_rating` trigger
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

---

## 🔜 Planned

**Adversary Sharing**
- [ ] Share custom adversaries from Vault/Adversaries tab
- [ ] Browse and import community adversaries into Vault

**Homebrew Cards**
- [ ] Card builder for custom domain cards, subclasses, classes, ancestries, communities
- [ ] Publish to community library; DMs can approve homebrew for their table

**Future**
- [ ] Contextual access — "Browse Community" links from Compendium and Adversary tabs
- [ ] Compendium toggle — option to show community homebrew alongside SRD data
- [ ] DM table integration — DM curates and approves community content for party use

---

## 💡 Ideas / Someday

_Brainstorm space — no commitment, just possibilities._

- **Account Linking** — link Google account to existing email account (or vice versa) to unify data under one identity
- **Party Message Board** — a simple board for DMs and players to post updates within the app _(low priority — most groups already use Discord, etc.)_
- **Table Scheduling** — DM sets a session schedule, players and DM receive email reminders _(high effort — requires email integration and additional infrastructure)_
- **Companion/Pet Tracker** — HP, abilities, notes on character sheet
