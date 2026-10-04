// v1 (SRD 1.0) — imported as-is and tagged. This is the frozen base of our database.
//  - daggersearch: cards, compendium (already in our template shape)
//  - seansbox: adversaries (flat shape the DM tracker uses)
import { asList, slug } from '../lib.js';

export const V1_DAGGERSEARCH_FILES = ['ancestries', 'armors', 'classes', 'communities', 'consumables', 'domain-cards', 'items', 'rules', 'subclasses', 'weapons'];

export function adaptDaggersearch(category, data) {
    return asList(data).map(r => ({ ...r, srdVersion: 1, source: 'daggersearch' }));
}

export function adaptSeansboxAdversaries(data) {
    return asList(data).map(r => ({ id: `v1_adversary_${slug(r.name)}`, ...r, srdVersion: 1, source: 'seansbox' }));
}
