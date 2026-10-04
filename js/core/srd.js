// SRD catalog loader — the only place the app reads SRD data.
// Data: /data/srd/current.json → { dataVersion } → /data/srd/<dataVersion>/<kind>.json (immutable)
// Each kind is fetched once per data version and cached in IndexedDB (works offline after first load).
const BASE = '/data/srd/';
const DB_NAME = 'duality-forge-srd';
const STORE = 'files';

let _current = null;
const _kinds = new Map();

// ---------- tiny IndexedDB key/value ----------
let _db = null;
function db() {
    if (_db) return _db;
    _db = new Promise((resolve) => {
        if (!('indexedDB' in globalThis)) return resolve(null);
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
    return _db;
}
async function idb(mode, fn) {
    const d = await db();
    if (!d) return undefined;
    return new Promise((resolve) => {
        const tx = d.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => resolve(undefined);
    });
}
const idbGet = (k) => idb('readonly', s => s.get(k));
const idbSet = (k, v) => idb('readwrite', s => s.put(v, k));

// Remove cached files from older data versions
async function prune(dataVersion) {
    const keys = (await idb('readonly', s => s.getAllKeys())) || [];
    const stale = keys.filter(k => typeof k === 'string' && !k.startsWith(dataVersion + '/') && k !== 'current');
    if (stale.length) await idb('readwrite', s => { stale.forEach(k => s.delete(k)); return null; });
}

// ---------- catalog ----------
export async function current() {
    if (_current) return _current;
    _current = (async () => {
        try {
            const res = await fetch(BASE + 'current.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error(res.status);
            const cur = await res.json();
            idbSet('current', cur);
            prune(cur.dataVersion);
            return cur;
        } catch {
            const cached = await idbGet('current');   // offline: use the last known version
            if (cached) return cached;
            throw new Error('SRD data unavailable');
        }
    })();
    return _current;
}

export function loadKind(kind) {
    if (_kinds.has(kind)) return _kinds.get(kind);
    const p = (async () => {
        const { dataVersion } = await current();
        const key = `${dataVersion}/${kind}`;
        const cached = await idbGet(key);
        if (cached) return cached;
        const res = await fetch(`${BASE}${dataVersion}/${kind}.json`);
        if (!res.ok) throw new Error(`SRD ${kind}: ${res.status}`);
        const rows = await res.json();
        idbSet(key, rows);
        return rows;
    })();
    p.catch(() => _kinds.delete(kind));    // allow retry after a failure
    _kinds.set(kind, p);
    return p;
}

export const loadKinds = (kinds) => Promise.all(kinds.map(loadKind)).then(lists => Object.fromEntries(kinds.map((k, i) => [k, lists[i]])));

export async function getRecord(id) {
    const kind = String(id).split('.')[0];
    return (await loadKind(kind)).find(r => r.id === id) || null;
}

export const nameKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------- display helpers ----------
export const label = (v) => String(v ?? '').split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
export const upper = (v) => String(v ?? '').replace(/-/g, '_').toUpperCase();
export const domainKey = (id) => String(id ?? '').replace(/^domain\./, '').toUpperCase();   // 'domain.arcana' → 'ARCANA'

export function formatDice({ count, die, bonus } = {}) {
    const dice = die ? `${count > 1 ? count : ''}d${die}` : '';
    const b = bonus ? (bonus > 0 && dice ? `+${bonus}` : String(bonus)) : '';
    return (dice + b) || '0';
}
export function formatDamage(d, { short = true } = {}) {
    if (!d) return '';
    const type = short ? { physical: 'phy', magic: 'mag', either: 'phy/mag' }[d.type] : label(d.type);
    return `${formatDice(d)}${d.direct ? ' direct' : ''} ${type}`.trim();
}

export const versionBadge = (v) => (v === 2 ? '<span class="srd-badge srd-v2" title="SRD 2.0">v2</span>' : '');
