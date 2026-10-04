// npm run srd:check — is there anything new upstream since our pinned v2 commit?
// Exit code 0 = up to date, 10 = updates available (used by the weekly GitHub Action).
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const { v2 } = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/srd/sources.json'), 'utf8'));
const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

let updates = 0;
for (const [key, src] of Object.entries(v2)) {
    const res = await fetch(`https://api.github.com/repos/${src.repo}/compare/${src.commit}...${src.branch || 'main'}`, { headers });
    if (!res.ok) { console.error(`✘ ${key}: GitHub API ${res.status}`); process.exitCode = 1; continue; }
    const cmp = await res.json();
    const dataFiles = (cmp.files || []).filter(f => f.filename.startsWith(src.path + '/'));
    if (!cmp.ahead_by) { console.log(`✔ ${key} (${src.repo}) — up to date at ${src.commit.slice(0, 7)}`); continue; }
    updates++;
    console.log(`⬆ ${key} (${src.repo}) — ${cmp.ahead_by} new commit(s), ${dataFiles.length} data file(s) changed`);
    dataFiles.forEach(f => console.log(`    ${f.status.padEnd(8)} ${f.filename}  (+${f.additions} −${f.deletions})`));
    (cmp.commits || []).slice(-10).forEach(c => console.log(`    ${c.sha.slice(0, 7)} ${c.commit.message.split('\n')[0]}`));
    console.log(`  To update: set "commit": "${cmp.commits.at(-1).sha}" in tools/srd/sources.json, then npm run srd:build`);
}
if (updates) process.exitCode = 10;
