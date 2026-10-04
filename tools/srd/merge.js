// Merge rule: v1 is the frozen base; a v2 record is added only if its name is not already
// in v1 for the same category (exact name, case/punctuation-insensitive). v1 is never modified.
import { nameKey } from './lib.js';

export const recName = (r) => r.name?.['en-US'] ?? r.name;

export function merge(v1, v2) {
    const data = {}, stats = {};
    for (const cat of new Set([...Object.keys(v1), ...Object.keys(v2)])) {
        const base = v1[cat] || [];
        const known = new Set(base.map(r => nameKey(recName(r))));
        const added = (v2[cat] || []).filter(r => !known.has(nameKey(recName(r))));
        data[cat] = [...base, ...added];
        stats[cat] = { v1: base.length, v2: added.length, skipped: (v2[cat] || []).length - added.length, total: data[cat].length, added: added.map(recName) };
    }
    return { data, stats };
}
