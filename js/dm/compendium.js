import { escHtml, getLocStr } from './app.js';

const GITHUB_RAW = "https://raw.githubusercontent.com/daggersearch/daggerheart-data/main/core/";
const CATEGORIES = ['ancestries','armors','classes','communities','consumables','domain-cards','items','rules','subclasses','weapons'];
const COMPENDIUM_CACHE_KEY = 'dh_compendium_cache';
let compendiumData = [];
let activeCategory = 'all';
let activeFilters = {};
let searchTimeout = null;

export async function loadCompendium() {
    // Bind search listener up front so it works regardless of cache/fetch path
    document.getElementById('compendiumSearch').addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(runSearch, 200); });

    const cached = localStorage.getItem(COMPENDIUM_CACHE_KEY);
    if (cached) { try { compendiumData = JSON.parse(cached); document.getElementById('compendiumStatus').textContent = `${compendiumData.length} entries loaded. Start typing to search.`; return; } catch {} }
    document.getElementById('compendiumStatus').textContent = 'Fetching compendium data...';
    try {
        const results = await Promise.all(CATEGORIES.map(cat => fetch(GITHUB_RAW + cat + '.json').then(r => r.json()).then(data => { const items = Array.isArray(data) ? data : (data.items || data.entries || Object.values(data)); return items.map(item => ({ ...item, _category: cat })); }).catch(() => [])));
        compendiumData = results.flat();
        localStorage.setItem(COMPENDIUM_CACHE_KEY, JSON.stringify(compendiumData));
        document.getElementById('compendiumStatus').textContent = `${compendiumData.length} entries loaded. Start typing to search.`;
    } catch { document.getElementById('compendiumStatus').textContent = 'Failed to load compendium data.'; }
}

const CATEGORY_FILTERS = {
    'weapons': [{ field: 'tier', label: 'Tier', values: ['1','2','3','4'] }, { field: 'damage.type', label: 'Damage', values: ['PHYSICAL','MAGIC'] }, { field: 'range', label: 'Range', values: ['MELEE','RANGED'] }, { field: 'burden', label: 'Hands', values: ['ONE_HANDED','TWO_HANDED'] }, { field: 'trait', label: 'Trait', values: ['AGILITY','STRENGTH','FINESSE','INSTINCT','PRESENCE','KNOWLEDGE'] }],
    'armors': [{ field: 'tier', label: 'Tier', values: ['1','2','3','4'] }, { field: 'baseScore', label: 'Score', values: ['2','3','4','5','6'] }],
    'domain-cards': [{ field: 'domain', label: 'Domain', values: ['ARCANA','BLADE','BONE','CODEX','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'] }, { field: 'type', label: 'Type', values: ['ABILITY','SPELL'] }, { field: 'level', label: 'Level', values: ['1','2','3','4','5','6','7','8','9','10'] }],
    'subclasses': [{ field: 'class', label: 'Class', values: ['BARD','DRUID','GUARDIAN','RANGER','ROGUE','SERAPH','SORCERER','WARRIOR','WIZARD'] }, { field: 'spellcastTrait', label: 'Spellcast', values: ['AGILITY','STRENGTH','FINESSE','INSTINCT','PRESENCE','KNOWLEDGE'] }],
    'classes': [{ field: 'domains_includes', label: 'Domain', values: ['ARCANA','BLADE','BONE','CODEX','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'] }],
};

function setCategory(cat) {
    activeCategory = cat; activeFilters = {};
    document.querySelectorAll('#categoryFilters .filter-pill').forEach(btn => btn.classList.toggle('active', btn.textContent.trim().toLowerCase().replace(' ', '-') === cat || (cat === 'all' && btn.textContent.trim().toLowerCase() === 'all')));
    renderContextFilters(); runSearch();
}

function renderContextFilters() {
    const container = document.getElementById('contextFilters');
    const filterDefs = CATEGORY_FILTERS[activeCategory];
    if (!filterDefs) { container.classList.add('hidden'); container.innerHTML = ''; return; }
    container.classList.remove('hidden');
    container.innerHTML = filterDefs.map(f => {
        const selected = activeFilters[f.field] || '';
        return `<div class="flex flex-col"><label class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold mb-0.5">${escHtml(f.label)}</label><select onchange="window._setFilter('${f.field}', this.value)" class="bg-[#1e1b16] border border-[#4a3f30] rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-[#d4a017] cursor-pointer"><option value="">All</option>${f.values.map(v => `<option value="${escHtml(v)}" ${selected === v ? 'selected' : ''}>${v.replace(/_/g, ' ')}</option>`).join('')}</select></div>`;
    }).join('');
}

function setFilter(field, value) { if (value) activeFilters[field] = value; else delete activeFilters[field]; runSearch(); }

function getNestedField(item, field) {
    if (field === 'domains_includes') return item.domains || [];
    return field.split('.').reduce((v, p) => v?.[p], item);
}

function itemMatchesFilters(item) {
    for (const [field, expected] of Object.entries(activeFilters)) {
        const actual = getNestedField(item, field);
        if (field === 'domains_includes') { if (!Array.isArray(actual) || !actual.includes(expected)) return false; }
        else { if (String(actual) !== String(expected)) return false; }
    }
    return true;
}

function runSearch() {
    const query = document.getElementById('compendiumSearch').value.trim().toLowerCase();
    const resultsEl = document.getElementById('compendiumResults'), statusEl = document.getElementById('compendiumStatus');
    let filtered = compendiumData;
    if (activeCategory !== 'all') filtered = filtered.filter(item => item._category === activeCategory);
    if (Object.keys(activeFilters).length > 0) filtered = filtered.filter(itemMatchesFilters);
    if (query.length > 0) filtered = filtered.filter(item => {
        const name = getLocStr(item.name).toLowerCase();
        const desc = Array.isArray(item.description) ? item.description.map(d => d.paragraph ? getLocStr(d.paragraph) : (d.list ? d.list.map(li => getLocStr(li)).join(' ') : '')).join(' ').toLowerCase() : (typeof item.description === 'string' ? item.description.toLowerCase() : '');
        return name.includes(query) || desc.includes(query);
    });
    if (query.length === 0 && activeCategory === 'all' && Object.keys(activeFilters).length === 0) { resultsEl.innerHTML = ''; statusEl.textContent = `${compendiumData.length} entries loaded. Start typing to search.`; return; }
    if (filtered.length === 0) { resultsEl.innerHTML = ''; statusEl.textContent = 'No results found.'; return; }
    const limited = filtered.slice(0, 60);
    statusEl.textContent = filtered.length > 60 ? `Showing 60 of ${filtered.length} results.` : `${filtered.length} result${filtered.length > 1 ? 's' : ''}.`;
    resultsEl.innerHTML = limited.map(item => renderCompendiumCard(item)).join('');
}

function renderDescBlocks(descArr) {
    if (!descArr || !Array.isArray(descArr)) return '';
    return descArr.map(d => { if (d.paragraph) return `<p>${escHtml(getLocStr(d.paragraph))}</p>`; if (d.list) return `<ul class="ml-4 list-disc">${d.list.map(li => `<li>${escHtml(getLocStr(li))}</li>`).join('')}</ul>`; return ''; }).join('');
}

function renderCompendiumCard(item) {
    const cat = item._category, name = getLocStr(item.name) || item.title || 'Unnamed', catClass = 'cat-' + cat;
    let body = '';
    // Simplified — render tags + features for all categories
    const tags = [];
    if (item.tier) tags.push(`Tier ${item.tier}`);
    if (item.domain) tags.push(item.domain);
    if (item.type) tags.push(item.type);
    if (item.level !== undefined) tags.push(`Lv ${item.level}`);
    if (item.range) tags.push(item.range);
    if (item.burden) tags.push(item.burden.replace(/_/g, ' '));
    if (item.baseScore) tags.push(`Score ${item.baseScore}`);
    if (item.class) tags.push(item.class);
    if (item.domains && item.domains.length) tags.push(...item.domains);
    if (tags.length) body += `<div class="flex flex-wrap gap-2 mb-1.5">${tags.map(t => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(t)}</span>`).join('')}</div>`;
    if (item.damage) { let dmg = item.damage.dice || ''; if (item.damage.modifier) dmg += `+${item.damage.modifier}`; if (item.damage.type) dmg += ` ${item.damage.type.toLowerCase()}`; body += `<div class="text-xs text-red-300 mb-1">⚔️ ${escHtml(dmg)}</div>`; }
    if (item.description && Array.isArray(item.description)) body += `<div class="text-xs text-zinc-500 mb-2">${renderDescBlocks(item.description.slice(0, 2))}</div>`;
    const featureSources = [item.features, item.classFeatures, item.hopeFeature ? [item.hopeFeature] : null, item.foundation?.features, item.specialization?.features, item.mastery?.features];
    for (const src of featureSources) {
        if (!Array.isArray(src)) continue;
        body += src.map(f => { const fn = f.name ? getLocStr(f.name) : ''; const fd = f.description ? renderDescBlocks(f.description) : ''; return `<div class="mt-1">${fn ? `<span class="text-[10px] font-bold text-amber-200">${escHtml(fn)}</span> ` : ''}<span class="text-xs text-zinc-400">${fd}</span></div>`; }).join('');
    }
    const idx = compendiumData.indexOf(item);
    return `<div class="compendium-card border-t-3 ${catClass} cursor-pointer" style="border-top: 3px solid" onclick="window._openCardModal(${idx})">
        <div class="flex items-start justify-between mb-2"><span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(name)}</span><span class="card-category ${catClass} ml-2 whitespace-nowrap">${cat.replace('-', ' ')}</span></div>${body}</div>`;
}

function openCardModal(index) {
    const item = compendiumData[index]; if (!item) return;
    const name = getLocStr(item.name) || item.title || 'Unnamed', catClass = 'cat-' + item._category;
    // Reuse same card body but in modal
    const card = renderCompendiumCard(item);
    document.getElementById('cardModalContent').innerHTML = `<div class="flex items-start justify-between mb-4"><span class="font-black text-2xl font-[Cinzel] text-[#f5efe6]">${escHtml(name)}</span><span class="card-category ${catClass} ml-2 whitespace-nowrap">${item._category.replace('-', ' ')}</span></div><div class="modal-scaled">${card}</div>`;
    document.getElementById('cardModal').classList.remove('hidden');
}

function closeCardModal() { document.getElementById('cardModal').classList.add('hidden'); }
function clearCompendiumSearch() { document.getElementById('compendiumSearch').value = ''; setCategory('all'); }

// ========== WINDOW BINDINGS ==========
window.setCategory = setCategory;
window._setFilter = setFilter;
window._openCardModal = openCardModal;
window.closeCardModal = closeCardModal;
window.clearCompendiumSearch = clearCompendiumSearch;
