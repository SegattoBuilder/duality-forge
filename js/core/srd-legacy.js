// Bridges between the SRD catalog (schema v2) and what saves/screens store.
//  - Sheet cards: { v: 2, ref, srdVersion, name, category, domain, type, level, recallCost, classInfo, text, features, … }
//  - Old sheet cards (desc/feature as HTML) → converted on load, matched to the catalog by name
//  - Adversaries → the "enemyData" shape the DM tracker/vault already use (+ ref, srdVersion)
import { nameKey, domainKey, upper, label } from './srd.js';

// ---------- HTML (old saves) → Markdown-lite ----------
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m]);

export function htmlToText(html) {
    if (!html) return '';
    return decode(String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(strong|b)>/gi, '**')
        .replace(/<\/?(em|i)>/gi, '_')
        .replace(/<li[^>]*>/gi, '\n- ').replace(/<\/li>/gi, '')
        .replace(/<p[^>]*>\s*•\s*/gi, '\n- ')
        .replace(/<\/(p|div|ul|ol)>/gi, '\n\n')
        .replace(/<[^>]+>/g, ''))
        .replace(/\n- /g, '\n- ')
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
        .replace(/(\n- [^\n]*)\n\n(?=- )/g, '$1\n')     // keep consecutive list items together
        .trim();
}

// Old feature HTML: <div class="…amber…">Name</div><div class="…zinc-400…">text</div> (repeated)
export function htmlToFeatures(html) {
    if (!html) return [];
    const re = /<div[^>]*class="[^"]*text-amber[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/gi;
    const out = [];
    let m, last = 0;
    while ((m = re.exec(html))) { out.push({ name: htmlToText(m[1]), text: htmlToText(m[2]) }); last = re.lastIndex; }
    const rest = htmlToText(html.slice(last));
    if (rest) out.push({ name: '', text: rest });
    return out;
}

// ---------- catalog record → sheet card ----------
const CATEGORY = { 'domain-card': 'domain-cards.json', ancestry: 'ancestries.json', community: 'communities.json', class: 'classes.json', subclass: 'subclasses.json' };
const stage = (s) => s[0].toUpperCase() + s.slice(1);

export function cardFromDomainCard(r) {
    return { v: 2, ref: r.id, srdVersion: r.srd.version, name: r.name, category: CATEGORY['domain-card'], domain: domainKey(r.domain), type: upper(r.cardType), level: r.level, recallCost: r.recall, text: r.text, features: [] };
}
export function cardFromAncestryOrCommunity(r) {
    return { v: 2, ref: r.id, srdVersion: r.srd.version, name: r.name, category: CATEGORY[r.kind], text: '', features: r.features.map(f => ({ name: f.name, text: f.text })) };
}
// Class / subclass cards are one feature each, named like the browser label: "Bard — Hope Feature: Make a Scene"
export function cardsFromClass(r) {
    const classInfo = r.domains.map(domainKey).join(' / ');
    const mk = (prefix, f) => ({ v: 2, ref: r.id, srdVersion: r.srd.version, name: `${r.name} — ${prefix}: ${f.name}`, label: `${r.name} — ${prefix}`, category: CATEGORY.class, classInfo, text: '', features: [{ name: f.name, text: f.text }] });
    return [mk('Hope Feature', r.hopeFeature), ...r.features.map(f => mk('Class Feature', f))];
}
export function cardsFromSubclass(r) {
    return ['foundation', 'specialization', 'mastery'].flatMap(s => r[s].map(f => ({
        v: 2, ref: r.id, srdVersion: r.srd.version, name: `${r.name} — ${stage(s)}: ${f.name}`, label: `${r.name} — ${stage(s)}`, tier: s,
        category: CATEGORY.subclass, text: '', features: [{ name: f.name, text: f.text }],
    })));
}

// ---------- old sheet card → v2 (runs on load; idempotent) ----------
// catalog: { 'domain-card': [...], ancestry: [...], community: [...], class: [...], subclass: [...] } (any may be missing)
export function upgradeSheetCard(card, catalog = {}) {
    if (!card || card.v === 2) return card;
    const up = {
        v: 2, ref: null, srdVersion: null,
        name: card.name, category: card.category, domain: card.domain || '', type: card.type || '',
        level: card.level, recallCost: card.recallCost, classInfo: card.classInfo || '',
        text: htmlToText(card.desc), features: htmlToFeatures(card.feature),
        ...(card._homebrew ? { _homebrew: true } : {}), ...(card.collapsed ? { collapsed: true } : {}),
    };
    if (card._homebrew) return up;
    const key = nameKey(card.name);
    const byKind = { 'domain-cards.json': 'domain-card', 'ancestries.json': 'ancestry', 'communities.json': 'community', 'classes.json': 'class', 'subclasses.json': 'subclass' }[card.category];
    const list = catalog[byKind] || [];
    let rec = list.find(r => nameKey(r.name) === key);
    // class/subclass feature cards are named "<Class> — <Stage>: <Feature>"
    if (!rec && (byKind === 'class' || byKind === 'subclass')) rec = list.find(r => key.startsWith(nameKey(r.name)));
    if (rec) { up.ref = rec.id; up.srdVersion = rec.srd.version; }
    return up;
}

// ---------- adversary (catalog) → enemyData (DM screens / saved campaigns) ----------
const legacyDice = (d) => (d.die ? `${d.count}d${d.die}` : '') + (d.bonus ? (d.bonus > 0 && d.die ? `+${d.bonus}` : String(d.bonus)) : '');
const legacyDamage = (d) => `${legacyDice(d) || '0'}${d.direct ? ' direct' : ''} ${{ physical: 'phy', magic: 'mag', either: 'phy/mag' }[d.type]}`;
const legacyFeatureName = (f) => (f.kind ? `${f.name}${f.value !== undefined ? ` (${f.value})` : ''} - ${label(f.kind)}` : f.name);

export function toEnemyData(a) {
    return {
        ref: a.id, srdVersion: a.srd.version,
        name: a.name, tier: String(a.tier), type: a.role === 'horde' ? `Horde (${a.hordeHp ?? ''}/HP)` : label(a.role),
        description: a.description, motives_and_tactics: (a.motives || []).join(', '),
        difficulty: String(a.difficulty), thresholds: a.thresholds ? `${a.thresholds.major ?? 'None'}/${a.thresholds.severe ?? 'None'}` : 'None',
        hp: String(a.hp), stress: a.stress == null ? 'None' : String(a.stress),
        atk: a.attack.bonus !== undefined ? (a.attack.bonus >= 0 ? `+${a.attack.bonus}` : String(a.attack.bonus)) : a.attack.bonusText,
        attack: a.attack.name, range: label(a.attack.range), damage: legacyDamage(a.attack.damage),
        experience: (a.experiences || []).map(e => (e.bonus == null ? e.name : `${e.name} ${e.bonus >= 0 ? '+' : ''}${e.bonus}`)).join(', '),
        feature: (a.features || []).map(f => ({ name: legacyFeatureName(f), text: f.text })),
    };
}

// "Relentless (3) - Passive" → { name, kind, value } (for chips on cards saved before the new data)
export function splitFeatureName(raw) {
    const m = String(raw ?? '').match(/^(.*?)(?:\s*\(([^)]*)\))?\s+-\s+(Passive|Action|Reaction|Evolution)$/i);
    return m ? { name: m[1].trim(), kind: m[3].toLowerCase(), ...(m[2] !== undefined ? { value: m[2] } : {}) } : { name: String(raw ?? '') };
}
