# Daggerheart Forge ⚒️

A unified web toolkit for [Daggerheart](https://www.daggerheart.com/) — combining DM tools and a digital character sheet into one monorepo.

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
- **Auto-save** — localStorage auto-cache + 30-second cloud sync when signed in
- **Profiles** — nickname, avatar, country/region
- **Feedback** — built-in bug reports and feature requests
- **Cloudflare Web Analytics** — privacy-friendly page analytics

## Tech Stack
- Vanilla JS (ES modules), Tailwind CSS (CDN), no build step
- Supabase for auth + cloud storage
- Cloudflare Pages for hosting, KV for feedback reports

## Project Structure
```
daggerheart-forge/
├── index.html              Landing page (tool chooser)
├── dm/index.html           DM Tools
├── character/
│   ├── index.html          Redirect → v2.html
│   └── v2.html             Character Sheet
├── css/                    Shared stylesheets
├── js/
│   ├── core/               Shared auth, config, analytics, feedback
│   ├── dm/                 DM tools modules
│   └── character/          Character sheet modules
├── images/                 Domain icons (11 PNGs)
└── functions/api/          Cloudflare Pages Functions
```

## Local Development
No build step required. Serve with any static file server:
```bash
npx serve .
```

## License
Fan-made tool for Daggerheart by Darrington Press. Not affiliated with or endorsed by Darrington Press or Critical Role.
