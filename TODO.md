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

---

## 🔜 Planned

### v0.9 — Account & Auth Improvements
- [x] Delete account (with confirmation + cascade cleanup of characters, tables, profile + analytics snapshot)
- [ ] Link Google account to existing email account (or vice versa)
=======
- [ ] Companion/pet tracker on character sheet (HP, abilities, notes)

### Community Sharing (`/community/`)
Dedicated page for browsing, rating, and importing community-created content. Accessible from the landing page and contextually from existing tools.

- [ ] **Chronicles** — DMs share individual chapters with metadata (recommended level, party size, environment type, difficulty, duration); other DMs browse, rate, and import into their own Chronicle as editable copies
- [ ] **Homebrew Cards** — card builder for custom domain cards, subclasses, classes, ancestries, communities; publish to community library; DMs can approve homebrew for their table, making it available to all party members
- [ ] **Custom Adversaries** — DMs publish custom adversaries for others to browse and import into their vault
- [ ] Contextual access — "Share to Community" / "Browse Community" links from Chronicle, Compendium, and Adversary tabs
- [ ] Compendium toggle — option to show community homebrew alongside SRD data
- [ ] DM table integration — DM curates and approves community content for party use
- [ ] Versioning — authors can update shared chapters (max 3 versions); importers see ℹ️ notification and choose to update or keep their version
- [ ] Account deletion — shared content stays in community as "Unknown" author; imported copies unaffected
- [ ] Sharing consent gate — one-time acknowledgment when first sharing (imported copies persist even if shared version is removed)
- [ ] **Legal update** — update Terms of Use and Privacy Policy to cover community-shared content, licensing, and user-generated content rights

---

## 💡 Ideas / Someday

_Brainstorm space — no commitment, just possibilities._

- **Account Linking** — link Google account to existing email account (or vice versa) to unify data under one identity
- **Party Message Board** — a simple board for DMs and players to post updates within the app _(low priority — most groups already use Discord, etc.)_
- **Table Scheduling** — DM sets a session schedule, players and DM receive email reminders _(high effort — requires email integration and additional infrastructure)_
