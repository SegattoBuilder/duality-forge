// npm run srd:build — rebuild the SRD catalog from the pinned sources (tools/srd/sources.json)
//
//   v1 (frozen base) + v2 records whose name is NOT in v1 for the same kind
//   → data/srd/<dataVersion>/<kind>.json + index.json + manifest.json, data/srd/current.json, data/srd/REPORT.md
//
// dataVersion is a hash of the content: same input → same folder (no churn); any change → new folder,
// so published files never change and can be cached forever.
// Fails (exit 1) on any schema error, broken reference, duplicate id or HTML in text.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import { fetchJson, rawUrl, asList } from './lib.js';
import { adaptDaggersearch, DAGGERSEARCH_FILES } from './adapters/daggersearch.js';
import { adaptFlat, FLAT_FILES, parseAdversaryNames } from './adapters/flat.js';
import { merge } from './merge.js';
import { SCHEMA, KIND_SCHEMAS, SCHEMA_VERSION } from './schema.js';
import { nameKey } from './lib.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'data/srd');
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/srd/sources.json'), 'utf8'));

async function loadV1() {
    const ds = sources.v1.daggersearch, sb = sources.v1.seansbox;
    const out = {};
    for (const [kind, file] of Object.entries(DAGGERSEARCH_FILES)) out[kind] = adaptDaggersearch(kind, await fetchJson(rawUrl(ds, `${file}.json`)), { version: 1, source: 'daggersearch' });
    out.adversary = adaptFlat('adversary', await fetchJson(rawUrl(sb, 'adversaries.json')), { version: 1, source: 'seansbox' });
    return out;
}

async function loadV2() {
    const src = sources.v2.srd2;
    const raw = {};
    for (const [kind, file] of Object.entries(FLAT_FILES)) raw[kind] = asList(await fetchJson(rawUrl(src, `${file}.json`)));
    return Object.fromEntries(Object.entries(raw).map(([kind, rows]) => [kind, adaptFlat(kind, rows, { version: 2, source: 'srd2', classes: raw.class })]));
}

// Cross-record links that need the whole catalog
function link(data) {
    const subsByClass = {};
    for (const s of data.subclass || []) (subsByClass[s.class] ||= []).push(s.id);
    for (const c of data.class || []) if (!c.subclasses.length) c.subclasses = subsByClass[c.id] || [];
    const advByName = new Map((data.adversary || []).map(a => [nameKey(a.name), a.id]));
    for (const e of data.environment || []) e.adversaries = [...new Set(parseAdversaryNames(e.adversariesText).map(n => advByName.get(nameKey(n))).filter(Boolean))];
    // Domain card lists only keep cards that exist in the catalog
    const cardIds = new Set((data['domain-card'] || []).map(c => c.id));
    for (const d of data.domain || []) d.cards = d.cards.map(level => level.filter(id => cardIds.has(id)));
}

function validate(data) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const errors = [];
    const allIds = new Set();
    for (const [kind, rows] of Object.entries(data)) {
        const check = ajv.compile(KIND_SCHEMAS[kind] || { not: {} });
        for (const r of rows) {
            if (allIds.has(r.id)) errors.push(`${kind}: duplicate id ${r.id}`);
            allIds.add(r.id);
            if (!check(r)) errors.push(`${r.id}: ${check.errors.slice(0, 3).map(e => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + JSON.stringify(e.params.allowedValues) : ''}`).join('; ')}`);
            const html = JSON.stringify(r).match(/<\/?[a-z][a-z0-9]*[\s>/]/i);
            if (html) errors.push(`${r.id}: HTML in data (${html[0]})`);
        }
    }
    // Every reference must point at an existing record
    const refs = (r) => [r.domain, r.class, ...(r.domains || []), ...(r.subclasses || []), ...(r.adversaries || []), ...(r.cards || []).flat()].filter(Boolean);
    for (const rows of Object.values(data)) for (const r of rows) for (const id of refs(r)) if (!allIds.has(id)) errors.push(`${r.id}: broken reference → ${id}`);
    return errors;
}

const INDEX_FIELDS = ['tier', 'level', 'domain', 'cardType', 'category', 'role', 'class', 'envType'];
const indexEntry = (r) => ({ id: r.id, kind: r.kind, name: r.name, v: r.srd.version, ...Object.fromEntries(INDEX_FIELDS.filter(f => r[f] !== undefined).map(f => [f, r[f]])) });

// One record per line: compact files with readable git diffs
const serialize = (rows) => '[\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]\n';

function report(stats, changes, dataVersion) {
    const lines = ['# SRD data report', '', `Data version \`${dataVersion}\` · schema v${SCHEMA_VERSION} · built by \`npm run srd:build\`.`, '',
        '- **v1** = SRD 1.0 base (frozen).', '- **v2** = SRD 2.0 entries whose name is not in v1 (exact name, case/punctuation-insensitive).', '- *Skipped* = 2.0 entries already in v1 under the same name (v1 kept).', '',
        '| Kind | v1 | v2 (new) | Skipped | Total |', '|---|---:|---:|---:|---:|'];
    const tot = { v1: 0, v2: 0, skipped: 0, total: 0 };
    for (const [kind, s] of Object.entries(stats)) { lines.push(`| ${kind} | ${s.v1} | ${s.v2} | ${s.skipped} | ${s.total} |`); for (const k in tot) tot[k] += s[k]; }
    lines.push(`| **All** | **${tot.v1}** | **${tot.v2}** | **${tot.skipped}** | **${tot.total}** |`, '');
    if (changes.length) lines.push('## Changes since the previous build', '', ...changes.map(c => `- ${c}`), '');
    lines.push('## v2 entries by kind', '');
    for (const [kind, s] of Object.entries(stats)) if (s.added.length) lines.push(`<details><summary>${kind} (${s.added.length})</summary>`, '', s.added.join(' · '), '', '</details>', '');
    return lines.join('\n');
}

function previousCatalog() {
    try {
        const { dataVersion } = JSON.parse(fs.readFileSync(path.join(OUT, 'current.json'), 'utf8'));
        const idx = JSON.parse(fs.readFileSync(path.join(OUT, dataVersion, 'index.json'), 'utf8'));
        return { dataVersion, ids: new Map(idx.map(e => [e.id, e])) };
    } catch { return null; }
}

// ---------- run ----------
const v1 = await loadV1();
const v2 = await loadV2();
const { data, stats } = merge(v1, v2);
link(data);
const errors = validate(data);
if (errors.length) {
    console.error(`✘ ${errors.length} problem(s):`);
    errors.slice(0, 50).forEach(e => console.error('  ' + e));
    process.exit(1);
}

const files = Object.fromEntries(Object.entries(data).map(([kind, rows]) => [`${kind}.json`, serialize(rows)]));
const index = Object.values(data).flat().map(indexEntry);
files['index.json'] = serialize(index);
const dataVersion = crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 10);

const prev = previousCatalog();
const changes = [];
if (prev && prev.dataVersion !== dataVersion) {
    const now = new Set(index.map(e => e.id));
    const added = index.filter(e => !prev.ids.has(e.id)).map(e => e.id), removed = [...prev.ids.keys()].filter(id => !now.has(id));
    if (added.length) changes.push(`+${added.length}: ${added.slice(0, 12).join(', ')}${added.length > 12 ? ', …' : ''}`);
    if (removed.length) changes.push(`−${removed.length}: ${removed.slice(0, 12).join(', ')}${removed.length > 12 ? ', …' : ''}`);
    if (!added.length && !removed.length) changes.push('Same entries; content of existing entries changed.');
}

const manifest = {
    schemaVersion: SCHEMA_VERSION, dataVersion,
    sources: Object.fromEntries(Object.entries({ ...sources.v1, ...sources.v2 }).filter(([k]) => !k.startsWith('_')).map(([k, s]) => [k, { repo: s.repo, commit: s.commit, srd: s.srd }])),
    kinds: Object.fromEntries(Object.entries(stats).map(([k, s]) => [k, { file: `${k}.json`, v1: s.v1, v2: s.v2, total: s.total }])),
    attribution: [
        'This product includes materials from the Daggerheart System Reference Document 1.0 and 2.0, © Critical Role, LLC. under the terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at https://www.daggerheart.com. There are no previous modifications by others.',
    ],
};
files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';

// Replace previous version folders + any legacy flat files with the new layout
for (const entry of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) {
    const p = path.join(OUT, entry);
    if (entry !== dataVersion && (fs.statSync(p).isDirectory() || entry.endsWith('.json'))) fs.rmSync(p, { recursive: true });
}
const dir = path.join(OUT, dataVersion);
fs.mkdirSync(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
fs.writeFileSync(path.join(OUT, 'current.json'), JSON.stringify({ schemaVersion: SCHEMA_VERSION, dataVersion }) + '\n');
fs.writeFileSync(path.join(OUT, 'REPORT.md'), report(stats, changes, dataVersion));
fs.mkdirSync(path.join(ROOT, 'data/schema'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/schema/srd.schema.json'), JSON.stringify(SCHEMA, null, 2) + '\n');

console.log(`✔ data/srd/${dataVersion}/ — schema v${SCHEMA_VERSION}${prev?.dataVersion === dataVersion ? ' (unchanged)' : ''}`);
for (const [kind, s] of Object.entries(stats)) console.log(`  ${kind.padEnd(15)} v1 ${String(s.v1).padStart(4)}  +v2 ${String(s.v2).padStart(4)}  (skipped ${s.skipped})`);
if (changes.length) { console.log('\nChanges since previous build:'); changes.forEach(c => console.log('  ' + c)); }
