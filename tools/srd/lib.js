// Shared helpers for the SRD data pipeline (Node only — not loaded by the app)

export const slug = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Comparison key for the v1/v2 merge: case/punctuation-insensitive name
export const nameKey = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const kebab = (s) => slug(s);

export const int = (s) => {
    const n = parseInt(String(s ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
};

export const titleCase = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());

export const splitList = (s) => String(s ?? '').split(/,\s*/).map(x => x.trim()).filter(Boolean);

export const recordId = (kind, name) => `${kind}.${slug(name)}`;

// ---------- Text (Markdown-lite) ----------
// Allowed in data: paragraphs (blank line), "- " lists, **bold**, _italic_ / *italic*, "## heading", | tables |.
// No HTML. The app renders it with js/core/text.js (escape first, then these rules).

const tidy = (s) => String(s ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
export const text = (s) => tidy(s);

// v1 description blocks [{ paragraph: {en-US} } | { list: [{en-US}] }] → Markdown-lite
export function blocksToText(blocks) {
    return tidy((blocks || []).map(b => b.list
        ? b.list.map(i => `- ${i['en-US'] ?? i}`).join('\n')
        : (b.paragraph?.['en-US'] ?? b.paragraph ?? '')).join('\n\n'));
}

export const en = (v) => (v && typeof v === 'object' ? v['en-US'] ?? '' : v ?? '');

// ---------- Features ----------
// "Relentless (3) - Passive" → { name: 'Relentless', kind: 'passive', value: 3 }
const FEATURE_KINDS = ['passive', 'action', 'reaction', 'evolution'];
export function parseFeatureName(raw) {
    const m = String(raw ?? '').trim().match(/^(.*?)(?:\s*\(([^)]*)\))?\s+-\s+([A-Za-z]+)$/);
    if (m && FEATURE_KINDS.includes(m[3].toLowerCase())) {
        const v = m[2] === undefined ? undefined : (/^\d+$/.test(m[2]) ? +m[2] : m[2]);
        return { name: m[1].trim(), kind: m[3].toLowerCase(), ...(v !== undefined ? { value: v } : {}) };
    }
    return { name: String(raw ?? '').trim() };
}

export const feature = (name, body, extra = {}) => ({ ...parseFeatureName(name), text: text(body), ...extra });

// ---------- Dice / damage ----------
// "1d12+2 phy" | "d8+3 mag" | "3 phy" | "6 direct phy" | "d6+1 phy/mag"
export function parseDamage(s) {
    const m = String(s ?? '').trim().match(/^(?:(\d*)d(\d+))?\s*(?:([+-])?\s*(\d+))?\s*(direct\s+)?(phy\/mag|phy|mag)\b/i);
    if (!m || (!m[2] && !m[4])) throw new Error(`Unparseable damage: "${s}"`);
    const type = { phy: 'physical', mag: 'magic', 'phy/mag': 'either' }[m[6].toLowerCase()];
    const dice = m[2] ? { count: m[1] ? +m[1] : 1, die: +m[2] } : { count: 0, die: 0 };
    const bonus = m[4] ? (m[3] === '-' ? -1 : 1) * +m[4] : 0;
    return { ...dice, bonus, type, ...(m[5] ? { direct: true } : {}) };
}

// "8/14" | "None" | "12/None" → { major, severe } | null
export function parseThresholds(s) {
    const parts = String(s ?? '').split('/').map(p => int(p));
    if (parts.every(p => p === null)) return null;
    return { major: parts[0] ?? null, severe: parts[1] ?? null };
}

// "Tremor Sense +2, Keen Senses +3" → [{ name, bonus }]
export function parseExperiences(s) {
    return splitList(s).map(e => {
        const m = e.match(/^(.*?)\s*([+-]\d+)$/);
        return m ? { name: m[1].trim(), bonus: +m[2] } : { name: e, bonus: null };
    });
}

// ---------- Fetch ----------
export async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return JSON.parse((await res.text()).replace(/^\uFEFF/, ''));
}

export const rawUrl = (src, file) => `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${src.path}/${file}`;

export const asList = (d) => (Array.isArray(d) ? d : (d.items || d.entries || Object.values(d)));
