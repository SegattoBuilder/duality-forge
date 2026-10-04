// Merge rule: v1 is the frozen base; a v2 record is added only if its name is not already
// in v1 for the same kind (exact name, case/punctuation-insensitive). v1 is never modified.
import { nameKey } from './lib.js';

export function merge(v1, v2) {
    const data = {}, stats = {};
    for (const kind of new Set([...Object.keys(v1), ...Object.keys(v2)])) {
        const base = v1[kind] || [];
        const known = new Set(base.map(r => nameKey(r.name)));
        const added = (v2[kind] || []).filter(r => !known.has(nameKey(r.name)));
        data[kind] = [...base, ...added];
        stats[kind] = { v1: base.length, v2: added.length, skipped: (v2[kind] || []).length - added.length, total: data[kind].length, added: added.map(r => r.name) };
    }
    return { data, stats };
}
