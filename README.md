# Duality Forge <img src="images/logo/icon-192.png" alt="logo" width="48">

A unified web toolkit for tabletop RPGs — combining DM tools and a digital character sheet into one monorepo.

## Tools

### ⚔️ DM Tools (`/dm/`)
- **Combat Tracker** — manage adversaries, HP/stress dots, fear pool, action counters, drag & drop reorder
- **Vault** — stash creatures between encounters
- **Chronicle** — session notes with chapters, NPCs, and music cues
- **Adversaries** — search the SRD adversary database, filter by tier/difficulty/type
- **Compendium** — browse weapons, armors, items, classes, domain cards, and more

### 🗡️ Character Sheet (`/character/`)
- Tabbed responsive layout (Combat, Cards, Inventory, Story, Support)
- HP / Stress / Hope / Armor dot trackers
- SRD card library — browse and add domain cards, class features, ancestries, communities
- Star up to 5 domain cards as your active loadout
- Gear slots, inventory, gold tracking, experience
- 10 accent color themes × 4 display modes (Dark, Light, Sci-Fi, Fantasy)

## Shared Features
- **Cloud sync** — sign in with Google or email to save/load across devices (Supabase)
- **Auto-save** — localStorage auto-cache + 5-minute cloud sync when signed in
- **Profiles** — nickname, avatar, country/region
- **Feedback** — built-in bug reports and feature requests
- **Cloudflare Web Analytics** — privacy-friendly page analytics

## Tech Stack
- Vanilla JS (ES modules), Tailwind CSS (prebuilt `css/tailwind.css`, committed), no build step on deploy
- Supabase for auth + cloud storage
- Cloudflare Pages for hosting, KV for feedback reports

## Project Structure
```
duality-forge/
├── index.html              Landing page (tool chooser)
├── dm/index.html           DM Tools
├── character/index.html    Character Sheet
├── support/index.html      Shared support, feedback & how-to-use
├── css/                    Shared stylesheets
├── js/
│   ├── core/               Shared auth, config, analytics, feedback
│   ├── dm/                 DM tools modules
│   └── character/          Character sheet modules
├── images/                 Domain icons (11 PNGs)
└── functions/api/          Cloudflare Pages Functions
```

## Local Development
```bash
npm ci            # once per machine — dev tools (Tailwind CLI, tests, git hooks)
npx serve .       # any static file server works
```

**Styling:** Tailwind classes are compiled into `css/tailwind.css` (committed, so Cloudflare Pages
needs no build step). The pre-commit hook rebuilds it automatically. To see new classes while
developing, run `npm run build:css` (or `npx tailwindcss -c tailwind.config.js -i css/tailwind.src.css -o css/tailwind.css --watch`).

**Tests:** `npm test`

## SRD data
The compendium, card library and adversaries read our own catalog in `data/srd/` (never a third-party
site at runtime). v1 = SRD 1.0 (frozen), v2 = SRD 2.0 entries not in v1. Format: `docs/srd-schema.md`.
- `npm run srd:check` — anything new upstream? (also runs weekly as a GitHub Action and opens an issue)
- `npm run srd:build` — rebuild from the pinned commits in `tools/srd/sources.json`, validate, write
  `data/srd/<version>/` and `data/srd/REPORT.md` (review it before committing)

## License
Fan-made tool for tabletop RPGs. Not affiliated with or endorsed by Darrington Press or Critical Role.
