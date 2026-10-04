// npm run srd:build — rebuild data/srd/ from the pinned sources in tools/srd/sources.json
//
//  v1 (frozen base) + v2 records whose name is NOT already in v1 (same category) → data/srd/<category>.json
//  Every record is validated against our template (tools/srd/schema.js). Fails on any error.
//  Writes data/srd/manifest.json and data/srd/REPORT.md (what's in each version + what changed vs. last build).
import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import { fetchJson, rawUrl, asList } from './lib.js';
import { merge, recName } from './merge.js';
import { adaptDaggersearch, adaptSeansboxAdversaries, V1_DAGGERSEARCH_FILES } from './adapters/v1.js';
import { adaptV2, V2_FILES } from './adapters/v2.js';
import { SCHEMA, CATEGORY_SCHEMAS } from './schema.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'data/srd');
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/srd/sources.json'), 'utf8'));

async function loadV1() {
    const ds = sources.v1.daggersearch, sb = sources.v1.seansbox;
    const out = {};
    for (const cat of V1_DAGGERSEARCH_FILES) out[cat] = adaptDaggersearch(cat, await fetchJson(rawUrl(ds, `${cat}.json`)));
    out.adversaries = adaptSeansboxAdversaries(await fetchJson(rawUrl(sb, 'adversaries.json')));
    return out;
}

async function loadV2() {
    const src = sources.v2.srd2;
    const raw = {};
    for (const [cat, file] of Object.entries(V2_FILES)) raw[cat] = asList(await fetchJson(rawUrl(src, `${file}.json`)));
    const ctx = { classes: raw.classes };
    return Object.fromEntries(Object.entries(raw).map(([cat, rows]) => [cat, adaptV2(cat, rows, ctx)]));
}

function validate(data) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const errors = [];
    for (const [cat, rows] of Object.entries(data)) {
        const schema = CATEGORY_SCHEMAS[cat];
        if (!schema) { errors.push(`${cat}: no schema`); continue; }
        const check = ajv.compile(schema);
        const ids = new Set();
        for (const r of rows) {
            if (ids.has(r.id)) errors.push(`${cat}: duplicate id ${r.id}`);
            ids.add(r.id);
            if (!check(r)) errors.push(`${cat}/${r.id}: ${check.errors.slice(0, 3).map(e => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + JSON.stringify(e.params.allowedValues) : ''}`).join('; ')}`);
        }
    }
    return errors;
}

// One record per line: compact files with readable git diffs
const serialize = (rows) => '[\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]\n';

function previousIds(cat) {
    try { return new Set(JSON.parse(fs.readFileSync(path.join(OUT, `${cat}.json`), 'utf8')).map(r => r.id)); } catch { return null; }
}

function report(stats, data, changes) {
    const lines = ['# SRD data report', '', `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run srd:build\`.`, '',
        '- **v1** = SRD 1.0 base (frozen).', '- **v2** = SRD 2.0 entries whose name is not in v1 (exact name, case/punctuation-insensitive).', '- *Skipped* = 2.0 entries already in v1 under the same name (v1 kept).', '',
        '| Category | v1 | v2 (new) | Skipped | Total |', '|---|---:|---:|---:|---:|'];
    for (const [cat, s] of Object.entries(stats)) lines.push(`| ${cat} | ${s.v1} | ${s.v2} | ${s.skipped} | ${s.total} |`);
    const tot = Object.values(stats).reduce((a, s) => ({ v1: a.v1 + s.v1, v2: a.v2 + s.v2, skipped: a.skipped + s.skipped, total: a.total + s.total }), { v1: 0, v2: 0, skipped: 0, total: 0 });
    lines.push(`| **All** | **${tot.v1}** | **${tot.v2}** | **${tot.skipped}** | **${tot.total}** |`, '');
    if (changes.length) { lines.push('## Changes since the previous build', '', ...changes.map(c => `- ${c}`), ''); }
    lines.push('## v2 entries by category', '');
    for (const [cat, s] of Object.entries(stats)) if (s.added.length) lines.push(`<details><summary>${cat} (${s.added.length})</summary>`, '', s.added.join(' · '), '', '</details>', '');
    return lines.join('\n');
}

const v1 = await loadV1();
const v2 = await loadV2();
const { data, stats } = merge(v1, v2);
const errors = validate(data);
if (errors.length) {
    console.error(`✘ ${errors.length} validation error(s):`);
    errors.slice(0, 40).forEach(e => console.error('  ' + e));
    process.exit(1);
}

const changes = [];
for (const [cat, rows] of Object.entries(data)) {
    const prev = previousIds(cat);
    if (!prev) continue;
    const now = new Set(rows.map(r => r.id));
    const added = [...now].filter(i => !prev.has(i)), removed = [...prev].filter(i => !now.has(i));
    if (added.length) changes.push(`${cat}: +${added.length} (${added.slice(0, 8).join(', ')}${added.length > 8 ? ', …' : ''})`);
    if (removed.length) changes.push(`${cat}: −${removed.length} (${removed.slice(0, 8).join(', ')}${removed.length > 8 ? ', …' : ''})`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [cat, rows] of Object.entries(data)) fs.writeFileSync(path.join(OUT, `${cat}.json`), serialize(rows));
fs.mkdirSync(path.join(ROOT, 'data/schema'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/schema/srd.schema.json'), JSON.stringify(SCHEMA, null, 2) + '\n');
const manifest = {
    version: `v1@${sources.v1.daggersearch.commit.slice(0, 7)}+v2@${sources.v2.srd2.commit.slice(0, 7)}`,
    generated: new Date().toISOString(),
    sources: { ...sources.v1, ...sources.v2 },
    categories: Object.fromEntries(Object.entries(stats).map(([c, s]) => [c, { file: `${c}.json`, v1: s.v1, v2: s.v2, total: s.total }])),
};
delete manifest.sources._comment;
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'REPORT.md'), report(stats, data, changes));

console.log(`✔ data/srd built — ${manifest.version}`);
for (const [cat, s] of Object.entries(stats)) console.log(`  ${cat.padEnd(16)} v1 ${String(s.v1).padStart(4)}  +v2 ${String(s.v2).padStart(4)}  (skipped ${s.skipped})`);
if (changes.length) { console.log('\nChanges since previous build:'); changes.forEach(c => console.log('  ' + c)); }
