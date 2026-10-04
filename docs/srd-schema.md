# Duality Forge — SRD data schema (proposal, for review)

Status: **approved 2026-10-04** (decisions in §9) · Branch: `feature/srd-data` · Implemented in `tools/srd/` (schemaVersion 2)

Goal: one data format that is **good** (complete, consistent, easy to work with), **fast** (small, cacheable,
quick to search on a phone) and **safe** (no HTML in data, validated, can't break the app). We control it,
so the app's UI/internal code adapts to the format — not the other way around.

---

## 1. What the existing sources do

| | daggersearch (v1 cards today) | seansbox / JHerrin00 (adversaries today, SRD 2.0) | klrkdekira (SRD 2.0, JSON-LD) |
|---|---|---|---|
| Shape | Nested, every string wrapped `{ "en-US": … }` | Flat, **everything is a string** (`"tier": "1"`, `"damage": "d8+3 phy"`) | Flat-ish, typed, one file per object |
| Text | Blocks `[{ paragraph: {en-US} }]` | Markdown strings | Plain strings |
| Numbers / enums | Numbers + `UPPER_CASE` enums ✔ | Strings — app must parse | Mixed (some still strings) |
| IDs | `core_domain_card_x` ✔ | none | URL ids + slugs ✔ |
| Provenance | — | — | chapter / page / line ✔ |
| Feature metadata | name + text | name like `"Relentless (3) - Passive"` (kind baked into name) | `kind`, `stage` ✔ |
| Cross-references | — | — | ids ✔ |
| Size / speed | Verbose (localisation wrappers everywhere) | Compact | Very verbose (JSON-LD context, 13 MB search index) |
| App effort | Today's code depends on it | Parse strings at runtime | Heavy |

**Take from each:** typed numbers + enums and stable ids (daggersearch); compact flat records and Markdown-lite
text (SRD sources); slugs, feature `kind`, `role`, weapon `category`/`variant`, provenance and id references
(klrkdekira). **Leave out:** localisation wrappers (English only — translations can be separate files keyed by
id later), JSON-LD context, strings-for-everything, HTML.

---

## 2. Principles

1. **Typed, never "stringly"** — numbers are numbers, choices are enums, dice are structured. The app never
   parses `"d8+3 phy"` or `"5 / 11"` at runtime.
2. **One envelope for every record** — same identity/provenance fields everywhere, so search, caching,
   badges (v1/v2) and homebrew work the same way for all kinds.
3. **Text is Markdown-lite, never HTML** — only `**bold**`, `_italic_`, line breaks and `- ` lists. Our renderer
   escapes everything first, then applies those few rules → injection-proof by construction (no sanitizer
   needed for SRD data; homebrew uses the same rules).
4. **References by id**, not by name — subclass → class, class → domains, environment → adversaries.
5. **Enums are lowercase-kebab** (`very-close`, `two-handed`) — readable, URL/CSS-safe; the UI maps them to labels.
6. **Small and immutable** — one file per kind, served from a versioned folder with long caching.
7. **Same schema for homebrew** — community cards are validated with the same rules (origin `homebrew`).

---

## 3. The envelope (every record)

```jsonc
{
  "id": "domain-card.rune-ward",        // "<kind>.<slug>", stable forever, unique across v1+v2
  "kind": "domain-card",                // see list below
  "name": "Rune Ward",
  "slug": "rune-ward",
  "srd": {
    "version": 1,                       // 1 | 2  → v2 badge in the UI
    "source": "daggersearch",           // which import produced it
    "ref": "core_domain_card_rune_ward" // the source's own id/name (for re-imports & debugging)
  },
  "tags": ["spell", "arcana"],          // optional, for search/filters
  // …kind-specific fields…
}
```

Kinds: `domain-card`, `class`, `subclass`, `ancestry`, `community`, `weapon`, `armor`, `item`, `consumable`,
`adversary`, `environment`, `beastform`, `transformation`, `rule`, `domain`, `campaign-frame`.

**Feature** (shared by everything that has abilities):

```jsonc
{ "name": "Relentless", "kind": "passive", "value": 3, "cost": null, "text": "The Burrower can be spotlighted…" }
// kind: passive | action | reaction | hope | null   (parsed from "Relentless (3) - Passive")
// cost: e.g. { "hope": 3 } or { "stress": 1 } when the text starts with "Spend 3 Hope" — optional, for future UI
```

**Dice**: `{ "count": 1, "die": 8, "bonus": 3 }` → renders `d8+3`. **Damage**: `{ ...dice, "type": "physical" | "magic" | "either" }`.

---

## 4. Kind-specific fields (summary)

| Kind | Fields |
|---|---|
| `domain-card` | `domain` (id), `cardType` (`ability`/`spell`/`grimoire`), `level` 1–10, `recall` ≥0, `text` |
| `weapon` | `tier` 1–4, `category` (`primary`/`secondary`), `variant` (`core`, `combat-wheelchair`, …), `trait` (`agility`…`spellcast`), `range` (`melee`…`very-far`), `damage`, `burden` (`one-handed`/`two-handed`), `features[]` |
| `armor` | `tier`, `thresholds: { major, severe }`, `score`, `features[]` |
| `class` | `domains: [id, id]`, `evasion`, `hp`, `hopeFeature`, `features[]`, `items[]`, `subclasses: [id, id]`, `questions: { background[], connection[] }`, `description` |
| `subclass` | `class` (id), `spellcastTrait?`, `foundation[]`, `specialization[]`, `mastery[]`, `description?` |
| `ancestry` / `community` | `description`, `features[]`, community: `traits[]` (adaptable, centered…) |
| `item` / `consumable` | `text`, `roll?` (d60 loot table number) |
| `adversary` | `tier`, `role` (`solo`, `bruiser`, `minion`…), `difficulty`, `thresholds: { major, severe } \| null`, `hp`, `stress`, `attack: { name, bonus, range, damage }`, `experiences: [{ name, bonus }]`, `motives[]`, `description`, `features[]` |
| `environment` | `tier`, `envType` (`exploration`, `social`, …), `difficulty`, `impulses[]`, `adversaries: [id…]`, `features[]` (+ GM `question`) |
| `beastform` | `tier`, `examples[]`, `traitBonus`, `evasionBonus`, `attack`, `advantages[]`, `features[]` |
| `transformation` / `rule` / `campaign-frame` | `text` (Markdown-lite; rules may contain tables → rendered as real tables) |

Example — adversary (today vs. proposed):

```jsonc
// today (SRD source)
{ "name": "Acid Burrower", "tier": "1", "type": "Solo", "difficulty": "14", "thresholds": "8/14", "hp": "8",
  "stress": "3", "atk": "+3", "attack": "Claws", "range": "Very Close", "damage": "1d12+2 phy",
  "experience": "Tremor Sense +2", "feature": [{ "name": "Relentless (3) - Passive", "text": "…" }] }

// proposed
{ "id": "adversary.acid-burrower", "kind": "adversary", "name": "Acid Burrower", "slug": "acid-burrower",
  "srd": { "version": 1, "source": "seansbox", "ref": "Acid Burrower" },
  "tier": 1, "role": "solo", "difficulty": 14, "thresholds": { "major": 8, "severe": 14 }, "hp": 8, "stress": 3,
  "attack": { "name": "Claws", "bonus": 3, "range": "very-close", "damage": { "count": 1, "die": 12, "bonus": 2, "type": "physical" } },
  "experiences": [{ "name": "Tremor Sense", "bonus": 2 }],
  "features": [{ "name": "Relentless", "kind": "passive", "value": 3, "text": "…" }] }
```

What that buys the DM tracker: HP/Stress dots straight from numbers, sortable by tier/difficulty, filters by
role, "Passive / Action / Reaction" chips on features, no string parsing.

---

## 5. Files, speed and caching

```
data/srd/<dataVersion>/          content hash, e.g. data/srd/4eb879d924/
  index.json                     ~21 KB gzipped: every record's id, kind, name, srd.version, tags, tier/level → search & lists
  domain-card.json  weapon.json  adversary.json  …   full records, one file per kind
  manifest.json                  sources, commits, counts
data/srd/current.json            → { "dataVersion": "2026-10-04.1" }   (tiny, short cache)
```

- **Folder per data version** → files never change once published → `Cache-Control: immutable, 1 year`.
  The phone downloads a kind once; a new import = new folder = automatic refresh.
- **Index first**: search/browse lists load ~15 KB; full kind files load when you open a category or a card.
- **IndexedDB cache** on the device (not localStorage — no 5 MB limit, not blocking the UI).
- Sizes (gzipped, first build): index 21 KB, domain cards 24 KB, weapons 13 KB, adversaries 79 KB, everything ~320 KB.

---

## 6. Safety

- **No HTML anywhere** in data. Markdown-lite renderer: escape → bold/italic/lists/tables. Unit-tested with
  XSS payloads.
- **Build-time validation** (schema + extra rules: unique ids, references resolve, dice sane, text length
  limits). Build fails → nothing ships.
- **Runtime guard**: app checks `manifest.schemaVersion`; unknown version → keeps the cached one.
- **Homebrew** (community cards) validated against the same schema before saving/sharing; origin `homebrew`.

---

## 7. Saved characters / campaigns (important)

Today a card added to a sheet is **copied** into the save (name, text, even generated HTML). Proposal:

```jsonc
// on the sheet
{ "ref": "domain-card.rune-ward", "srdVersion": 1, "snapshot": { "name": "Rune Ward", "level": 1, "text": "…" }, "notes": "" }
```

- `ref` links to the catalog (latest wording, v2 badge, details view); `snapshot` keeps the sheet readable
  offline and unchanged if the catalog ever changes.
- **Migration**: old saves are upgraded on load (match by name → `ref`, keep old text as `snapshot`, convert
  stored HTML to Markdown-lite). Nothing is lost; unmatched cards stay as custom cards.

---

## 8. Work this implies

| Area | Change |
|---|---|
| Build pipeline | Adapters now emit the new format (v1 + v2), index/manifest, validation rules — **mostly done, adapt** |
| `js/core/srd.js` (new) | Load index/kinds, IndexedDB cache, lookup by id |
| `js/core/text.js` (new) | Markdown-lite renderer (replaces HTML features + `sanitizeHtml` for SRD text) |
| Compendium | Read new fields (filters on enums, tier/level numbers), v1/v2 badge & filter |
| Character sheet | Cards/gear use `ref + snapshot`; save migration |
| DM tracker / vault | Adversaries from structured fields (no parsing), feature chips |
| Community homebrew | Validate with same schema; store in the same shape |
| Tests | Schema, adapters, renderer XSS, save migration, headless UI checks |

Rough effort: pipeline 0.5 day · loader + renderer 0.5–1 day · compendium 1 day · sheet + migration 1–1.5 days
· DM 1 day · homebrew 0.5 day. Done in stages on the branch; each stage tested before the next.

---

## 9. Decisions (2026-10-04)

1. **Localisation**: English only, no `{ "en-US": … }` wrappers — keep the door open for translation files keyed by id later. ✔
2. **Enums lowercase-kebab** (`very-close`). ✔
3. **Feature `kind`/`value`** parsed only when the name matches the standard `Name (N) - Kind` pattern; anything else stays unchanged. ✔
4. **Saved cards = `ref` + small `snapshot`**; existing saves converted automatically on open, matched cards marked v1, unmatched kept as custom. ✔
5. **Provenance** = `srd.source` + `srd.ref` only (internal). ✔
6. **Tables** in rules/campaign text rendered as real tables. ✔
