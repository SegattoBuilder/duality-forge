# Duality Forge — Project Rules for AI Assistants

These rules protect established design decisions. Do NOT change any of the following without explicitly asking the user first.

---

## Architecture & Stack
- **No build step** — this is vanilla JS (ES modules), Tailwind CSS (CDN), no bundler, no framework. Do not introduce build tools, transpilers, or package managers.
- **Supabase** for auth + cloud storage. Do not suggest alternative backends.
- **Cloudflare Pages** for hosting. Do not suggest alternative hosting.
- **File encoding** — `js/community/app.js` uses UTF-8 with BOM (`utf-8-sig`). Preserve this when editing.

## Theme & Styling System
- **4 display modes**: dark (default), light, scifi, fantasy — defined in `css/themes.css` with `[data-mode="..."]` selectors.
- **10 accent colors** — defined in `js/core/theme.js`. All accent references must use `var(--accent-1)` through `var(--accent-5)`, never hardcoded hex.
- **Component class system** — buttons, inputs, cards, modals all have semantic CSS classes in `css/components.css` (e.g. `btn-primary`, `input-field`, `modal-panel`, `compendium-card`). Use these classes instead of inline Tailwind for any new UI.
- **Theme overrides** — every component class has overrides for all 4 modes in `themes.css`. New components must also get mode overrides.
- **Quill editor** is isolated from theme text overrides. Each mode has its own canvas (bg + text color) in `themes.css`. User-picked colors from the Quill toolbar render as-is. Do not override Quill editor content colors globally.
- **`text-zinc-500` and `text-zinc-600`** have been intentionally darkened in `base.css` for readability. Do not revert these.

### CRITICAL: All New UI Must Follow the Theme System
Every new page, modal, card, panel, button, input, or any visible element MUST:
1. **Import and initialize the theme** — call `initMode()` and `applyTheme()` from `js/core/theme.js` on page load, exactly as DM (`js/dm/app.js`) and Character pages do.
2. **Include all shared CSS** — every HTML page must link `base.css`, `textures.css`, `components.css`, `themes.css` (and `modern.css` if using `modern-tab-btn` tabs).
3. **Use existing component classes** — do not create one-off inline styles or new Tailwind combinations for elements that already have a component class (e.g. use `btn-primary` not `bg-gradient-to-r from-amber-700 ...`). Check `css/components.css` first.
4. **Use theme-aware colors** — backgrounds, borders, and text colors must use the established Tailwind utility classes that have overrides in `themes.css` (e.g. `bg-[#1e1b16]`, `border-[#3d362a]`, `text-[#f5efe6]`, `text-zinc-500`). Do not introduce new hardcoded colors without adding corresponding overrides for all 4 modes in `themes.css`.
5. **Use `var(--accent-1)` for accent colors** — never hardcode `#d4a017` or any other accent hex. Always use CSS variables so the user's chosen accent color applies.
6. **Add mode overrides for new components** — if you create a new CSS class in `components.css`, you MUST also add `[data-mode="light"]`, `[data-mode="scifi"]`, and `[data-mode="fantasy"]` overrides in `themes.css`. Look at existing component overrides as reference.
7. **Test mentally against all 4 modes** — before writing any color, background, or border value, consider: will this be readable in dark mode? Light mode? Scifi? Fantasy? If a value only works in one mode, it needs per-mode overrides.

The goal: a user can switch between dark, light, scifi, and fantasy modes and every page, modal, and element adapts correctly with zero visual breakage.

## Community Page (`/community/`)
- **Everyone is a customer** — the chapter author sees the same browse/import experience as everyone else. No special treatment for authors on the Browse tab.
- **Sign-in required** — all community actions (import, rate, share, browse) require authentication.
- **Import creates a new chronicle entry** every time — no in-place replacement. Title includes version when > 1 (e.g. "Chapter Name (v3)").
- **`community_imports` table** tracks unique users per chapter (upsert on `chapter_id, user_id`). Used for unique import count and Chronicle version checks. Do not remove.
- **Update notifications** — Chronicle checks versions on load. Badge is dismissible and version-aware (stored in `localStorage` key `dh_dm_dismissed_updates`). If author publishes a newer version beyond dismissed, badge reappears.
- **No deep-links or auto-replace** for updates. User goes to Community themselves, finds the chapter, imports again.
- **Nav header** matches DM layout: logo left, tabs center (`modern-tab-btn`), auth right.
- **Chapter cards** use `compendium-card` (not `cat-domain-cards`) with `border-top: 2px solid var(--accent-1)`.

## Share Modal (DM Chronicle → Community)
- **All metadata fields required** before Share button enables: title, description (3+ words), environment, difficulty, duration, and consent checkbox.
- **Duration options**: Short (1hr), Medium (2-3hr), Long (4-6hr), Extra Long (8hr+). These must stay consistent across the share modal, community filters, and community edit modal.
- **Duplicate prevention** — same author cannot share two chapters with the same title.

## Forced Modals (Do NOT make dismissible)
- **Campaign picker** (`campaignPickerModal` in `dm/index.html`) — must NOT be closeable with Escape or backdrop click. User must choose or go back to Forge.
- **Character picker** (equivalent in `character/index.html`) — same rule, must NOT be dismissible.

## localStorage Keys
- All keys are centralized in `js/core/constants.js`. Do not create new localStorage keys without adding them there first.
- `dh_dm_dismissed_updates` — tracks dismissed community update notifications per chapter version.

## General
- Do not remove user code including test cases unless explicitly asked.
- Prefer Python over PowerShell for scripting tasks — it handles encoding and Unicode better on this project.
- When editing `app.js` files with BOM encoding, use Python byte-level operations if the replacement tool fails due to encoding mismatches.
