import { escHtml } from './utils.js';
import { loadKinds, label, formatDamage, domainKey, versionBadge } from './srd.js';
import { renderText, renderFeatures, plainText } from './text.js';
import { cardFromDomainCard, cardFromAncestryOrCommunity } from './srd-legacy.js';

// UI category (filter pill) → SRD kind
const CATEGORY_KINDS = {
    weapons: 'weapon', armors: 'armor', items: 'item', consumables: 'consumable', classes: 'class', subclasses: 'subclass',
    ancestries: 'ancestry', communities: 'community', 'domain-cards': 'domain-card', rules: 'rule',
    transformations: 'transformation', beastforms: 'beastform', environments: 'environment',
};
const CATEGORIES = Object.keys(CATEGORY_KINDS);

let compendiumData = [];
let activeCategory = 'all';
let activeFilters = {};
let activeSort = 'name-asc';
let _characterMode = false;
let _handlers = {};
let _searchWired = false;
let _searchDebounce = null;
let _loading = null;

// Subclasses are browsed per stage (Foundation / Specialization / Mastery), as before
function expand(rec, cat) {
    if (cat !== 'subclasses') return [{ ...rec, _category: cat }];
    return ['foundation', 'specialization', 'mastery'].filter(s => rec[s]?.length).map(s => ({
        ...rec, _category: cat, _tier: s, _displayName: `${rec.name} — ${s[0].toUpperCase() + s.slice(1)}`, features: rec[s],
    }));
}

const displayName = (item) => item._displayName || item.name;
const allFeatures = (item) => [...(item.hopeFeature ? [{ ...item.hopeFeature, kind: undefined, name: `${item.hopeFeature.name} (Hope)` }] : []), ...(item.features || [])];
const bodyText = (item) => item.text || item.description || '';

function ensureLoaded() {
    if (_loading) return _loading;
    const statusEl = document.getElementById('compendiumStatus');
    statusEl.textContent = 'Loading compendium…';
    _loading = loadKinds(Object.values(CATEGORY_KINDS)).then(byKind => {
        compendiumData = CATEGORIES.flatMap(cat => byKind[CATEGORY_KINDS[cat]].flatMap(r => expand(r, cat)));
        compendiumData.forEach((item, i) => {
            item._idx = i;
            item._search = `${displayName(item)} ${plainText(bodyText(item))} ${allFeatures(item).map(f => `${f.name} ${plainText(f.text)}`).join(' ')}`.toLowerCase();
        });
        statusEl.textContent = `${compendiumData.length} entries loaded. Start typing to search.`;
        runSearch();
    }).catch(() => {
        _loading = null;
        statusEl.textContent = 'Could not load the compendium. Check your connection and try again.';
    });
    return _loading;
}

export function loadCompendium(opts = {}) {
    _characterMode = opts.characterMode || false;
    _handlers = opts;
    if (!_searchWired) {
        const search = document.getElementById('compendiumSearch');
        search.addEventListener('input', () => { ensureLoaded(); clearTimeout(_searchDebounce); _searchDebounce = setTimeout(runSearch, 200); });
        search.addEventListener('focus', ensureLoaded);
        _searchWired = true;
    }
    // Download only when the compendium is actually on screen
    const statusEl = document.getElementById('compendiumStatus');
    statusEl.textContent = 'Open the compendium to load entries.';
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); ensureLoaded(); } });
        io.observe(statusEl);
    } else ensureLoaded();
}

const DOMAINS = ['arcana', 'blade', 'bone', 'codex', 'dread', 'grace', 'midnight', 'sage', 'splendor', 'valor'];
const TRAITS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
const VERSION_FILTER = { field: 'srd.version', label: 'SRD', values: [['1', 'v1'], ['2', 'v2']] };
const opt = (values) => values.map(v => (Array.isArray(v) ? v : [v, label(v)]));
const CATEGORY_FILTERS = {
    weapons: [{ field: 'tier', label: 'Tier', values: opt([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]) }, { field: 'category', label: 'Slot', values: opt(['primary', 'secondary']) }, { field: 'damage.type', label: 'Damage', values: opt(['physical', 'magic', 'either']) }, { field: 'range', label: 'Range', values: opt(['melee', 'very-close', 'close', 'far', 'very-far']) }, { field: 'burden', label: 'Hands', values: opt(['one-handed', 'two-handed']) }, { field: 'trait', label: 'Trait', values: opt([...TRAITS, 'spellcast']) }],
    armors: [{ field: 'tier', label: 'Tier', values: opt([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]) }, { field: 'score', label: 'Score', values: opt(['2', '3', '4', '5', '6', '7', '8'].map(v => [v, v])) }],
    'domain-cards': [{ field: 'domain', label: 'Domain', values: DOMAINS.map(d => [`domain.${d}`, label(d)]) }, { field: 'cardType', label: 'Type', values: opt(['ability', 'spell', 'grimoire']) }, { field: 'level', label: 'Level', values: opt(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(v => [v, v])) }],
    subclasses: [{ field: 'class', label: 'Class', values: ['assassin', 'bard', 'brawler', 'druid', 'guardian', 'ranger', 'rogue', 'seraph', 'sorcerer', 'warlock', 'warrior', 'witch', 'wizard'].map(c => [`class.${c}`, label(c)]) }, { field: 'spellcastTrait', label: 'Spellcast', values: opt(TRAITS) }],
    classes: [{ field: 'domains_includes', label: 'Domain', values: DOMAINS.map(d => [`domain.${d}`, label(d)]) }],
    environments: [{ field: 'tier', label: 'Tier', values: opt([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]) }, { field: 'envType', label: 'Type', values: opt(['event', 'exploration', 'social', 'traversal']) }],
    beastforms: [{ field: 'tier', label: 'Tier', values: opt([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]) }],
};

function setCategory(cat) {
    activeCategory = cat; activeFilters = {}; activeSort = 'name-asc';
    document.querySelectorAll('#categoryFilters .filter-pill').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${cat}'`)));
    ensureLoaded();
    renderContextFilters(); runSearch();
}

function renderContextFilters() {
    const container = document.getElementById('contextFilters');
    const filterDefs = [...(CATEGORY_FILTERS[activeCategory] || []), VERSION_FILTER];
    container.classList.remove('hidden');
    let html = filterDefs.map(f => {
        const selected = activeFilters[f.field] || '';
        return `<div class="flex flex-col"><label class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold mb-0.5">${escHtml(f.label)}</label><select data-filter="${escHtml(f.field)}" class="input-compact cursor-pointer"><option value="">All</option>${f.values.map(([v, l]) => `<option value="${escHtml(v)}" ${selected === v ? 'selected' : ''}>${escHtml(l)}</option>`).join('')}</select></div>`;
    }).join('');
    html += `<div class="flex flex-col"><label class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold mb-0.5">Sort</label><select data-sort class="input-compact cursor-pointer">${getSortOptions().map(o => `<option value="${o.value}" ${activeSort === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    container.innerHTML = html;
    container.querySelectorAll('[data-filter]').forEach(sel => sel.addEventListener('change', () => setFilter(sel.dataset.filter, sel.value)));
    container.querySelector('[data-sort]').addEventListener('change', (e) => setSort(e.target.value));
}

function getSortOptions() {
    const opts = [{ value: 'name-asc', label: 'Name A→Z' }, { value: 'name-desc', label: 'Name Z→A' }];
    if (activeCategory === 'domain-cards') opts.push({ value: 'level-asc', label: 'Level ↑' }, { value: 'level-desc', label: 'Level ↓' });
    if (['weapons', 'armors', 'environments', 'beastforms'].includes(activeCategory)) opts.push({ value: 'tier-asc', label: 'Tier ↑' }, { value: 'tier-desc', label: 'Tier ↓' });
    if (activeCategory === 'all') opts.push({ value: 'category-asc', label: 'Category A→Z' }, { value: 'category-desc', label: 'Category Z→A' });
    return opts;
}

function setSort(value) { activeSort = value; runSearch(); }

function sortResults(items) {
    const [field, dir] = activeSort.split('-');
    const mult = dir === 'desc' ? -1 : 1;
    const cmp = (a, b) => (a < b ? -mult : a > b ? mult : 0);
    return items.slice().sort((a, b) => {
        if (field === 'name') return cmp(displayName(a).toLowerCase(), displayName(b).toLowerCase());
        if (field === 'level') return ((a.level ?? 999) - (b.level ?? 999)) * mult;
        if (field === 'tier') return ((a.tier ?? 999) - (b.tier ?? 999)) * mult;
        if (field === 'category') return cmp(a._category, b._category);
        return 0;
    });
}

function setFilter(field, value) { if (value) activeFilters[field] = value; else delete activeFilters[field]; runSearch(); }

function itemMatchesFilters(item) {
    for (const [field, expected] of Object.entries(activeFilters)) {
        if (field === 'domains_includes') { if (!(item.domains || []).includes(expected)) return false; continue; }
        const actual = field.split('.').reduce((v, p) => v?.[p], item);
        if (String(actual) !== String(expected)) return false;
    }
    return true;
}

function runSearch() {
    const query = document.getElementById('compendiumSearch').value.trim().toLowerCase();
    const resultsEl = document.getElementById('compendiumResults'), statusEl = document.getElementById('compendiumStatus');
    if (!compendiumData.length) { resultsEl.innerHTML = ''; return; }
    let filtered = compendiumData;
    if (activeCategory !== 'all') filtered = filtered.filter(item => item._category === activeCategory);
    if (Object.keys(activeFilters).length) filtered = filtered.filter(itemMatchesFilters);
    const hasFilters = activeCategory !== 'all' || Object.keys(activeFilters).length > 0;
    if (query.length > 0 && (hasFilters || query.length >= 3)) filtered = filtered.filter(item => item._search.includes(query));
    if (!hasFilters && query.length === 0) { resultsEl.innerHTML = ''; statusEl.textContent = `${compendiumData.length} entries loaded. Start typing to search.`; return; }
    if (!hasFilters && query.length < 3) { resultsEl.innerHTML = ''; statusEl.textContent = 'Type at least 3 characters to search.'; return; }
    filtered = sortResults(filtered);
    if (!filtered.length) { resultsEl.innerHTML = ''; statusEl.textContent = 'No results found.'; return; }
    const limited = filtered.slice(0, 60);
    statusEl.textContent = filtered.length > 60 ? `Showing 60 of ${filtered.length} results.` : `${filtered.length} result${filtered.length > 1 ? 's' : ''}.`;
    resultsEl.innerHTML = limited.map(item => renderCompendiumCard(item)).join('');
    resultsEl.querySelectorAll('[data-idx]').forEach(el => el.addEventListener('click', () => openCardModal(+el.dataset.idx)));
}

function tagsFor(item) {
    const tags = [];
    if (item.tier) tags.push(`Tier ${item.tier}`);
    if (item.domain) tags.push(label(domainKey(item.domain).toLowerCase()));
    if (item.cardType) tags.push(label(item.cardType));
    if (item.level !== undefined) tags.push(`Lv ${item.level}`);
    if (item.recall !== undefined) tags.push(`Recall ${item.recall}`);
    if (item.category && item.kind === 'weapon') tags.push(label(item.category));
    if (item.trait) tags.push(label(item.trait));
    if (item.range) tags.push(label(item.range));
    if (item.burden) tags.push(label(item.burden));
    if (item.score !== undefined) tags.push(`Score ${item.score}`);
    if (item.thresholds?.major != null) tags.push(`Major ${item.thresholds.major}+`);
    if (item.thresholds?.severe != null) tags.push(`Severe ${item.thresholds.severe}+`);
    if (item.class) tags.push(label(item.class.replace('class.', '')));
    if (item.spellcastTrait) tags.push(`Spellcast: ${label(item.spellcastTrait)}`);
    if (item.domains?.length) tags.push(...item.domains.map(d => label(d.replace('domain.', ''))));
    if (item.evasion !== undefined) tags.push(`Evasion ${item.evasion}`);
    if (item.hp !== undefined && item.kind === 'class') tags.push(`HP ${item.hp}`);
    if (item.envType) tags.push(label(item.envType));
    if (item.difficulty != null && item.kind === 'environment') tags.push(`Difficulty ${item.difficulty}`);
    if (item.traitBonus) tags.push(`${label(item.traitBonus.trait)} +${item.traitBonus.bonus}`);
    if (item.evasionBonus) tags.push(`Evasion +${item.evasionBonus}`);
    return tags;
}

function renderCompendiumCard(item, { full = false } = {}) {
    const cat = item._category, catClass = 'cat-' + cat;
    const tags = tagsFor(item);
    let body = tags.length ? `<div class="flex flex-wrap gap-2 mb-1.5">${tags.map(t => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(t)}</span>`).join('')}</div>` : '';
    const dmg = item.damage || item.attack?.damage;
    if (dmg) body += `<div class="text-xs text-red-300 mb-1">⚔️ ${escHtml(formatDamage(dmg))}${item.attack?.range ? ` · ${escHtml(label(item.attack.range))}` : ''}</div>`;
    if (item.examples?.length) body += `<div class="text-[11px] text-zinc-500 italic mb-1">${escHtml(item.examples.join(', '))}</div>`;
    const text = bodyText(item);
    if (text) body += `<div class="text-xs text-zinc-400 mb-2 md-text ${full ? '' : 'line-clamp-6'}">${renderText(text)}</div>`;
    if (item.impulses?.length) body += `<div class="text-[11px] text-zinc-500 mb-1"><span class="font-bold">Impulses:</span> ${escHtml(item.impulses.join(', '))}</div>`;
    if (full && item.adversariesText) body += `<div class="text-[11px] text-zinc-500 mb-1"><span class="font-bold">Potential adversaries:</span> ${escHtml(item.adversariesText)}</div>`;
    if (item.advantages?.length) body += `<div class="text-[11px] text-zinc-500 mb-1"><span class="font-bold">Advantage on:</span> ${escHtml(item.advantages.join(', '))}</div>`;
    const feats = allFeatures(item);
    if (feats.length) body += `<div class="mt-1">${renderFeatures(feats, { nameClass: 'text-[10px] font-bold text-amber-200 mt-1', textClass: 'text-xs text-zinc-400' })}</div>`;
    return `<div class="compendium-card ${catClass} ${full ? '' : 'cursor-pointer'}" style="border-top: 3px solid" ${full ? '' : `data-idx="${item._idx}"`}>
        <div class="flex items-start justify-between mb-2 gap-2"><span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(displayName(item))} ${versionBadge(item.srd?.version)}</span><span class="card-category ${catClass} ml-2 whitespace-nowrap">${escHtml(cat.replace('-', ' '))}</span></div>${body}</div>`;
}

const ADD_BUTTONS = {
    weapons: ['weapon', '🗡️ Add to Weapons'], armors: ['armor', '🛡️ Add to Armor'], items: ['item', '🔧 Add to Items'],
    consumables: ['consumable', '🧪 Add to Consumables'], 'domain-cards': ['domain', '🃏 Add to Domain Cards'],
    classes: ['general', '📜 Add to Cards'], subclasses: ['general', '📜 Add to Cards'], ancestries: ['general', '🧬 Add to Cards'], communities: ['general', '🏘️ Add to Cards'],
};

function openCardModal(index) {
    const item = compendiumData[index]; if (!item) return;
    const add = _characterMode && ADD_BUTTONS[item._category];
    document.getElementById('cardModalContent').innerHTML = `<div class="mb-4"><span class="font-black text-2xl font-[Cinzel] text-[#f5efe6]">${escHtml(displayName(item))}</span></div><div class="modal-scaled">${renderCompendiumCard(item, { full: true })}</div>${add ? `<button data-add class="mt-3 w-full btn-primary">${add[1]}</button>` : ''}`;
    document.querySelector('#cardModalContent [data-add]')?.addEventListener('click', (e) => { e.stopPropagation(); addToSheet(item); });
    document.getElementById('cardModal').classList.remove('hidden');
}

const TRAIT_FIELDS = { agility: 't_agi', strength: 't_str', finesse: 't_fin', instinct: 't_inst', presence: 't_pres', knowledge: 't_know' };
const featuresText = (item) => allFeatures(item).map(f => (f.name ? `${f.name}: ${plainText(f.text)}` : plainText(f.text))).join(' | ');
const link = (item) => ({ ref: item.id, srdVersion: item.srd.version });

function addToSheet(item) {
    const h = _handlers;
    switch (item._category) {
        case 'weapons':
            h.onAddWeapon?.({ name: item.name, trait: TRAIT_FIELDS[item.trait] || '', range: label(item.range), dmg: formatDamage(item.damage), feature: featuresText(item), equipped: false, ...link(item) });
            break;
        case 'armors':
            h.onAddArmor?.({ name: item.name, major: String(item.thresholds?.major ?? 0), severe: String(item.thresholds?.severe ?? 0), score: String(item.score ?? ''), feature: featuresText(item), equipped: false, ...link(item) });
            break;
        case 'items': h.onAddItem?.({ name: item.name, desc: plainText(item.text), ...link(item) }); break;
        case 'consumables': h.onAddConsumable?.({ name: item.name, qty: '1', desc: plainText(item.text), ...link(item) }); break;
        case 'domain-cards': h.onAddDomainCard?.(cardFromDomainCard(item)); break;
        case 'ancestries':
        case 'communities': h.onAddGeneral?.(cardFromAncestryOrCommunity(item)); break;
        case 'classes':
            h.onAddGeneral?.({ v: 2, ...link(item), name: item.name, category: 'classes.json', classInfo: item.domains.map(domainKey).join(' / '), text: '', features: allFeatures(item).map(f => ({ name: f.name, text: f.text })) });
            break;
        case 'subclasses':
            h.onAddGeneral?.({ v: 2, ...link(item), name: displayName(item), category: 'subclasses.json', text: '', features: item.features.map(f => ({ name: f.name, text: f.text })) });
            break;
        default: return;
    }
    closeCardModal();
}

function closeCardModal() { document.getElementById('cardModal').classList.add('hidden'); }
function clearCompendiumSearch() { document.getElementById('compendiumSearch').value = ''; setCategory('all'); }

// ========== WINDOW BINDINGS ==========
window.setCategory = setCategory;
window.closeCardModal = closeCardModal;
window.clearCompendiumSearch = clearCompendiumSearch;
