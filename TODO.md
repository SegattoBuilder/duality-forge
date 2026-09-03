# TODO — Duality Forge <img src="images/logo/icon-192.png" alt="logo" width="48">

## ✅ Completed Milestones

### v0.1 — Monorepo Foundation
- [x] Merged DM tools + character sheet into monorepo
- [x] Consolidated character sheet to single layout
- [x] Consolidated nav actions into kebab menu (DM + character)
- [x] Moved support to shared page, merged character nav into single row
- [x] Split gear and auth into separate nav buttons, added RLS cloud sync

### v0.2 — Compendium & Card Integration
- [x] Weapons, Armor, Items, Consumables can be added to character sheet from compendium
- [x] All cards in compendium have option to be added to character sheet
- [x] Card collapse, mobile nav fix, cross-tool sign-out cleanup, custom styled dialogs

### v0.3 — Branding & Polish
- [x] New logo and icons
- [x] Project name update (Duality Forge)
- [x] Tab persistence, collapse arrows, support link
- [x] Swap fantasy tab icons (scroll→story, book→compendium)

### v0.4 — Vault & Groups
- [x] Group options with Deploy All for DM in Vault
- [x] New Character option for DM and Sheet, removed all clear sheet
- [x] Vault clear includes groups, adversary +Add feedback, disposable default on

### v0.5 — Legal & Analytics
- [x] Terms/privacy pages, consent gate, updated how-to-use docs
- [x] Google verification, updated analytics
- [x] Cloudflare Web Analytics integration

### v0.6 — Cloud Sync & Auth
- [x] Landing page auth flow, DM Table with Party option
- [x] Cloud autosave system, unified cloud picker
- [x] Consent on signup, DM nav redesign, title toggle
- [x] Centralized magic numbers and localStorage keys into constants.js

### v0.7 — Party System
- [x] Table Party setup (DM creates table, shares code)
- [x] DM and player table linking, DM approval flow
- [x] DM read-only access to party members' character data
- [x] Sign-in gate on Party tab for logged-out users
- [x] Profile DM and Player experience standardized options
- [x] Handle DM table deletion gracefully for linked characters
- [x] Auto-save syncs table approval status (15-min cycle)
- [x] Forced campaign/character picker (no dismiss, back to forge link)

---

## 🔜 Planned

### v0.8 — Authentication & Account Management
- [x] Password reset from Profile (email users only)
- [x] Forgot password on Sign In modal
- [x] Hide password reset for Google OAuth users
- [ ] Delete account (with confirmation + cascade cleanup of characters, tables, profile)
- [x] Change email address
- [x] Session management (sign out from all devices)
- [ ] Link Google account to existing email account (or vice versa)

---

## 💡 Ideas / Someday

_Brainstorm space — no commitment, just possibilities._

- **DM Theme Support** — bring the character sheet's accent color themes and display modes (Dark, Light, Sci-Fi, Fantasy) to DM Tools
- **Chronicle Sharing** — add a status field to chapters (draft, completed); completed chapters can be shared to a community library for other DMs, with recommended level, party size, and star ratings
- **Custom Adversary Sharing** — allow DMs to publish custom adversaries to a shared community library for others to browse and import
- **Party Message Board** — a simple board for DMs and players to post updates within the app _(low priority — most groups already use Discord, etc.)_
- **Table Scheduling** — DM sets a session schedule, players and DM receive email reminders _(high effort — requires email integration and additional infrastructure)_

