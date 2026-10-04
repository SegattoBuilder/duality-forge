import { DOMAIN_COLORS, CATEGORY_LABELS, currentData, setCurrentData, addedCards, selectedDomainCards, savedCardsData, setSavedCardsData } from './state.js';
import { autoCache } from './save.js';
import { toggleCard } from './ui.js';
import { showConfirm, showAlert, getSupabase, getUser, getProfile } from '../core/auth.js';
import { TABLE_COMMUNITY_HOMEBREW } from '../core/constants.js';
import { escHtml, escHtmlAttr } from '../core/utils.js';
import { domainColor as _domainColor, escAttr, validateShareFields, validateDomainCardFields, validateGeneralCardFields, cardSortComparator } from './cards-logic.js';
import { loadKind, loadKinds, nameKey, versionBadge } from '../core/srd.js';
import { renderText, renderFeatures } from '../core/text.js';
import { cardFromDomainCard, cardFromAncestryOrCommunity, cardsFromClass, cardsFromSubclass, upgradeSheetCard } from '../core/srd-legacy.js';

// Card browser categories → SRD kind + how records become sheet cards
const BROWSER = {
    'domain-cards.json': { kind: 'domain-card', toCards: r => [cardFromDomainCard(r)] },
    'ancestries.json': { kind: 'ancestry', toCards: r => [cardFromAncestryOrCommunity(r)] },
    'communities.json': { kind: 'community', toCards: r => [cardFromAncestryOrCommunity(r)] },
    'classes.json': { kind: 'class', toCards: cardsFromClass },
    'subclasses.json': { kind: 'subclass', toCards: cardsFromSubclass },
};

// Catalog used to link old saved cards to SRD entries (filled by linkSheetCards)
let _catalog = {};

// Link cards saved before the SRD catalog existed (ref: null) to their catalog entry — runs once after load
export async function linkSheetCards() {
    const pending = savedCardsData.filter(c => c.v === 2 && !c.ref && !c._homebrew);
    if (!pending.length) return;
    try { _catalog = await loadKinds(['domain-card', 'ancestry', 'community', 'class', 'subclass']); } catch { return; }
    let changed = false;
    for (const card of pending) {
        const linked = upgradeSheetCard({ ...card, v: undefined, desc: '', feature: '' }, _catalog);
        if (linked.ref) { card.ref = linked.ref; card.srdVersion = linked.srdVersion; changed = true; }
    }
    if (changed) autoCache();
}

export function openCardDetail(id) {
    const el = document.getElementById(id);
    const title = el.querySelector('.text-xs.font-black')?.textContent || '';
    const body = document.getElementById(id + '-body');
    document.getElementById('cardDetailTitle').textContent = title;
    const titleEl = document.getElementById('cardDetailTitle');
    const color = el.querySelector('.text-xs.font-black')?.style.color;
    if (color) titleEl.style.color = color;
    document.getElementById('cardDetailBody').innerHTML = body.innerHTML;
    document.getElementById('cardDetailModal').classList.remove('hidden');
}

export function closeCardDetail() {
    document.getElementById('cardDetailModal').classList.add('hidden');
}

function domainColor(domain) {
    return _domainColor(domain, DOMAIN_COLORS);
}

export function openDatabase() {
    document.getElementById('srdModal').classList.remove('hidden');
    document.getElementById('dataType').value = '';
    document.getElementById('cardSearch').value = '';
    document.getElementById('cardSearch').classList.add('hidden');
    document.getElementById('domainFilter').value = '';
    document.getElementById('domainFilter').classList.add('hidden');
    document.getElementById('levelFilter').value = '';
    document.getElementById('levelFilter').classList.add('hidden');
    document.getElementById('modalResults').innerHTML = '<div class="text-zinc-600 text-center py-10 text-xs">Select a category above to browse.</div>';
    setCurrentData([]);
}

export function closeDatabase() {
    document.getElementById('srdModal').classList.add('hidden');
}

export async function fetchData() {
    const file = document.getElementById('dataType').value;
    if (!file || !BROWSER[file]) return;
    document.getElementById('cardSearch').value = '';
    document.getElementById('cardSearch').classList.remove('hidden');

    const domainFilter = document.getElementById('domainFilter');
    const levelFilter = document.getElementById('levelFilter');
    const isDomainCards = file === 'domain-cards.json';
    domainFilter.classList.toggle('hidden', !isDomainCards);
    levelFilter.classList.toggle('hidden', !isDomainCards);
    domainFilter.value = '';
    levelFilter.value = '';

    const container = document.getElementById('modalResults');
    container.innerHTML = '<div class="text-center py-10 text-[10px] text-zinc-500 animate-pulse uppercase">Fetching Data...</div>';

    try {
        const { kind, toCards } = BROWSER[file];
        let data = (await loadKind(kind)).flatMap(toCards);
        if (isDomainCards) data.sort((a, b) => (a.level || 0) - (b.level || 0));
        setCurrentData(data);
        displayResults(data);
    } catch (e) {
        container.innerHTML = `<div class="text-red-500 text-center p-4">Error: ${escHtml(e.message)}</div>`;
    }
}

export function filterCards() {
    const query = document.getElementById('cardSearch').value.toLowerCase();
    const domainVal = document.getElementById('domainFilter')?.value || '';
    const levelVal = document.getElementById('levelFilter')?.value || '';
    const filtered = currentData.filter(c => {
        const n = (c.name || '').toLowerCase();
        const label = (c.label || '').toLowerCase();
        const domain = (c.domain || '').toLowerCase();
        if (query && !n.includes(query) && !label.includes(query) && !domain.includes(query)) return false;
        if (domainVal && (c.domain || '') !== domainVal) return false;
        if (levelVal && String(c.level || '') !== levelVal) return false;
        return true;
    });
    displayResults(filtered);
}

function displayResults(data) {
    const container = document.getElementById('modalResults');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="text-zinc-600 text-center py-10 text-xs">No entries found.</div>';
        return;
    }

    const tierColors = { foundation: 'text-green-400', specialization: 'text-yellow-400', mastery: 'text-red-400' };
    data.forEach((card) => {
        const isDomainCards = card.category === 'domain-cards.json';
        const dc = isDomainCards ? domainColor(card.domain) : null;
        const alreadyAdded = addedCards.has(card.name.toLowerCase());
        const shown = card.label ? card.name.slice(card.label.length + 2) : card.name;

        const div = document.createElement('div');
        div.className = `p-4 bg-black/60 border rounded-lg mb-2 transition-all ${alreadyAdded ? 'opacity-40 cursor-default' : 'cursor-pointer hover:scale-[1.01]'}`;
        if (dc) {
            div.style.borderColor = dc.border;
            div.style.backgroundColor = dc.bg;
        } else {
            div.classList.add('border-zinc-800');
            if (!alreadyAdded) div.classList.add('hover:border-indigo-500');
        }
        if (!alreadyAdded) div.onclick = () => { addCardToSheet({ ...card }); closeDatabase(); };

        const addedBadge = alreadyAdded ? '<span class="text-[9px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">✓ Added</span>' : '';
        const domainBadge = isDomainCards
            ? `<img src="${dc.icon}" class="domain-icon-badge" alt="${escHtml(card.domain)}">
               <span class="text-[10px] font-bold uppercase px-1 rounded" style="color:${dc.text}">${escHtml(card.domain)}</span>
               <span class="text-[10px] text-zinc-500">Lvl ${escHtml(card.level)} · Recall ${escHtml(card.recallCost)}</span>`
            : '';

        div.innerHTML = `
            ${card.label ? `<div class="text-xs font-bold uppercase ${tierColors[card.tier] || ''} mb-1">${escHtml(card.label)}${card.classInfo ? ` <span class="text-zinc-500 text-[10px] normal-case">(${escHtml(card.classInfo)})</span>` : ''}</div>` : ''}
            ${domainBadge ? `<div class="flex gap-2 items-center mb-1">${domainBadge}</div>` : ''}
            <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-black uppercase" ${dc ? `style="color:${dc.text}"` : 'class="text-indigo-300"'}>${escHtml(shown)}</span>
                ${versionBadge(card.srdVersion)}
                ${addedBadge}
            </div>
            ${card.text ? `<div class="text-xs text-zinc-400 line-clamp-3 leading-relaxed md-text">${renderText(card.text)}</div>` : ''}
            ${card.features?.length ? `<div class="text-xs text-zinc-300 mt-1 leading-relaxed">${renderFeatures(card.features)}</div>` : ''}
        `;
        container.appendChild(div);
    });
}

export function addCardToSheet(input) {
    const opts = upgradeSheetCard(input, _catalog);    // old saves (HTML) → v2 card
    const { name, text, features, category, domain, level, recallCost } = opts;
    const isDomain = category === 'domain-cards.json';
    const container = document.getElementById(isDomain ? 'domainCards' : 'generalCards');
    if (container.innerText.trim() === 'None') container.innerHTML = '';

    const cardKey = name.toLowerCase();
    addedCards.add(cardKey);
    if (!savedCardsData.find(c => c.name.toLowerCase() === cardKey)) {
        savedCardsData.push(opts);
    }

    const id = 'card-' + Math.random().toString(36).substr(2, 9);
    const dc = isDomain ? domainColor(domain) : null;

    const isHomebrew = opts._homebrew || false;

    const collapsed = opts.collapsed || false;
    const html = `
    <div class="sheet-card relative mb-2" style="border-left-color:${dc ? '#3d362a' : 'var(--accent-1)'}; ${dc ? `border-top: 2px solid ${dc.border};` : ''}" id="${id}" data-card-name="${escHtml(cardKey)}" data-level="${escHtml(level || 0)}" data-domain-border="${dc ? dc.border : ''}" data-collapsed="${collapsed}">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-1.5 cursor-pointer card-toggle" data-id="${id}">
                <span class="collapse-btn text-zinc-500 text-xs" data-id="${id}">${collapsed ? '▶' : '▼'}</span>
                ${isDomain ? `<button class="text-zinc-600 hover:text-yellow-400 text-base leading-none domain-sel-btn" data-id="${id}" id="${id}-sel" title="Select for loadout">☆</button>` : ''}
                ${dc ? `<img src="${dc.icon}" class="domain-icon-badge" alt="${escHtml(domain)}">` : ''}
                <span class="text-xs font-black uppercase" ${dc ? `style="color:${dc.text}"` : ''}>${escHtml(name)}</span>
                ${versionBadge(opts.srdVersion)}
            </div>
            <div class="flex items-center gap-2">
                ${isDomain ? `<span class="text-[10px] font-bold uppercase" style="color:${dc.text}">${escHtml(domain)}</span>` : ''}
                ${isDomain ? `<span class="text-[10px] text-zinc-500 whitespace-nowrap">Lvl ${escHtml(level)} | Recall ${escHtml(recallCost)}</span>` : ''}
                ${!isDomain ? `<span class="text-[10px] text-zinc-500 uppercase">${CATEGORY_LABELS[category] || escHtml(category)}</span>` : ''}
                ${isHomebrew ? `<button class="text-zinc-500 hover:text-[#d4a017] transition-colors text-xs card-edit-hb" data-id="${id}" title="Edit card">✏️</button><button class="text-emerald-500 hover:text-emerald-300 transition-colors text-sm card-share" data-id="${id}" title="Share to Community">↪</button>` : ''}
                <button class="btn-remove card-remove" data-id="${id}">✕</button>
            </div>
        </div>
        <div id="${id}-body" class="mt-2" ${collapsed ? 'style="display:none"' : ''}>
            ${opts.classInfo ? `<div class="flex flex-wrap gap-1.5 mb-2">${opts.classInfo.split(' / ').map(d => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(d)}</span>`).join('')}</div>` : ''}
            ${text ? `<div class="text-xs text-zinc-500 leading-relaxed md-text">${renderText(text)}</div>` : ''}
            ${features?.length ? `<div class="leading-relaxed mb-1 text-xs">${renderFeatures(features)}</div>` : ''}
        </div>
    </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    const cardEl = document.getElementById(id);
    cardEl.querySelectorAll('.card-toggle').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('domain-sel-btn')) return;
            if (e.target.classList.contains('collapse-btn')) { toggleCardCollapse(id); return; }
            openCardDetail(id);
        });
    });
    cardEl.querySelector('.card-remove').addEventListener('click', () => removeCard(id));
    const shareBtn = cardEl.querySelector('.card-share');
    if (shareBtn) shareBtn.addEventListener('click', (e) => { e.stopPropagation(); openShareCard(id); });
    const editHbBtn = cardEl.querySelector('.card-edit-hb');
    if (editHbBtn) editHbBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditCard(id); });
    const selBtn = cardEl.querySelector('.domain-sel-btn');
    if (selBtn) {
        selBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDomainSelect(id); });
    }

    autoCache();
}

function toggleCardCollapse(id) {
    const el = document.getElementById(id);
    const body = document.getElementById(id + '-body');
    const btn = el.querySelector('.collapse-btn');
    const collapsed = el.getAttribute('data-collapsed') === 'true';
    el.setAttribute('data-collapsed', !collapsed);
    body.style.display = collapsed ? '' : 'none';
    btn.textContent = collapsed ? '▼' : '▶';
    const cardName = el.getAttribute('data-card-name');
    const saved = savedCardsData.find(c => c.name.toLowerCase() === cardName);
    if (saved) saved.collapsed = !collapsed;
    autoCache();
}

export function removeCard(id) {
    const el = document.getElementById(id);
    const cardName = el.getAttribute('data-card-name');
    if (cardName && selectedDomainCards.has(cardName)) {
        showAlert('Unmark this card from your loadout before removing it.');
        return;
    }
    showConfirm('Remove this card?', () => {
        if (cardName) {
            addedCards.delete(cardName);
            const idx = savedCardsData.findIndex(c => c.name.toLowerCase() === cardName);
            if (idx !== -1) savedCardsData.splice(idx, 1);
        }
        el.remove();
        autoCache();
    });
}

export function toggleDomainSelect(id) {
    const el = document.getElementById(id);
    const cardName = el.getAttribute('data-card-name');
    const domainBorder = el.getAttribute('data-domain-border');
    if (selectedDomainCards.has(cardName)) {
        selectedDomainCards.delete(cardName);
        el.classList.remove('domain-card-selected');
        el.style.borderLeftColor = '#3d362a';
        const btn = document.getElementById(id + '-sel');
        btn.textContent = '☆';
        btn.classList.remove('text-yellow-400');
    } else {
        if (selectedDomainCards.size >= 5) { showAlert('Max 5 domain cards can be selected.'); return; }
        selectedDomainCards.add(cardName);
        el.classList.add('domain-card-selected');
        if (domainBorder) el.style.borderLeftColor = domainBorder;
        const btn = document.getElementById(id + '-sel');
        btn.textContent = '★';
        btn.classList.add('text-yellow-400');
    }
    document.getElementById('domainSelectCount').textContent = `${selectedDomainCards.size}/5 selected`;
    reorderDomainCards();
    autoCache();
}

export function reorderDomainCards() {
    const container = document.getElementById('domainCards');
    const cards = Array.from(container.querySelectorAll('[data-card-name]'));
    cards.sort((a, b) => cardSortComparator(
        selectedDomainCards,
        { name: a.getAttribute('data-card-name'), level: parseInt(a.getAttribute('data-level')) || 0 },
        { name: b.getAttribute('data-card-name'), level: parseInt(b.getAttribute('data-level')) || 0 }
    ));
    cards.forEach(c => container.appendChild(c));
}

// ========== CREATE HOMEBREW CARD ==========
let createCardFeatures = [];

export function openCreateCard() {
    createCardFeatures = [];
    document.getElementById('createCardType').value = '';
    document.getElementById('createCardDomainFields').classList.add('hidden');
    document.getElementById('createCardGeneralFields').classList.add('hidden');
    document.getElementById('createCardFeaturesWrap').classList.add('hidden');
    document.getElementById('createCardActions').classList.add('hidden');
    document.getElementById('createCardModal').classList.remove('hidden');
}

export function closeCreateCard() {
    document.getElementById('createCardModal').classList.add('hidden');
}

export function onCreateCardTypeChange() {
    const type = document.getElementById('createCardType').value;
    document.getElementById('createCardDomainFields').classList.toggle('hidden', type !== 'domain-card');
    document.getElementById('createCardGeneralFields').classList.toggle('hidden', type !== 'general');
    const show = type !== '';
    document.getElementById('createCardFeaturesWrap').classList.toggle('hidden', !show);
    document.getElementById('createCardActions').classList.toggle('hidden', !show);
    if (show) {
        createCardFeatures = [];
        renderCreateCardFeatures();
        document.getElementById('createCardBtn').disabled = true;
        if (type === 'domain-card') {
            ['createCardDomainName','createCardDomain','createCardDomainType','createCardLevel','createCardRecall'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('createCardDomainDesc').value = '';
        } else {
            ['createCardCategory','createCardGeneralName'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('createCardGeneralDesc').value = '';
        }
    }
    validateCreateCard();
}

export function addCreateCardFeature() {
    createCardFeatures.push({ name: '', text: '' });
    renderCreateCardFeatures();
}

function renderCreateCardFeatures() {
    const el = document.getElementById('createCardFeatureList');
    if (!createCardFeatures.length) { el.innerHTML = '<div class="text-[10px] text-zinc-600 italic">No features yet</div>'; return; }
    el.innerHTML = createCardFeatures.map((f, i) => `<div class="flex gap-1.5 items-start">
        <input value="${escAttr(f.name)}" oninput="updateCreateCardFeature(${i},'name',this.value)" placeholder="Feature name" class="input-compact text-left px-2 flex-1">
        <textarea oninput="updateCreateCardFeature(${i},'text',this.value)" placeholder="Description" rows="2" class="input-compact text-left px-2 flex-[2] resize-y">${escAttr(f.text)}</textarea>
        <button onclick="removeCreateCardFeature(${i})" class="btn-remove text-xs mt-1">✕</button>
    </div>`).join('');
}

export function updateCreateCardFeature(i, field, val) {
    if (createCardFeatures[i]) createCardFeatures[i][field] = val;
    validateCreateCard();
}

export function removeCreateCardFeature(i) {
    createCardFeatures.splice(i, 1);
    renderCreateCardFeatures();
    validateCreateCard();
}

export function validateCreateCard() {
    const type = document.getElementById('createCardType').value;
    if (!type) return;
    let valid = false;
    if (type === 'domain-card') {
        valid = validateDomainCardFields({
            name: document.getElementById('createCardDomainName').value.trim(),
            domain: document.getElementById('createCardDomain').value,
            type: document.getElementById('createCardDomainType').value,
            level: document.getElementById('createCardLevel').value,
            recall: document.getElementById('createCardRecall').value
        });
    } else {
        valid = validateGeneralCardFields({
            category: document.getElementById('createCardCategory').value,
            name: document.getElementById('createCardGeneralName').value.trim()
        });
    }
    document.getElementById('createCardBtn').disabled = !valid;
}

export function submitCreateCard() {
    const type = document.getElementById('createCardType').value;
    const features = createCardFeatures.filter(f => f.name.trim() || f.text.trim()).map(f => ({ name: f.name.trim(), text: f.text.trim() }));

    let cardData;
    if (type === 'domain-card') {
        cardData = {
            v: 2, ref: null, srdVersion: null,
            name: document.getElementById('createCardDomainName').value.trim(),
            text: document.getElementById('createCardDomainDesc').value.trim(),
            features,
            category: 'domain-cards.json',
            domain: document.getElementById('createCardDomain').value,
            type: document.getElementById('createCardDomainType').value,
            level: parseInt(document.getElementById('createCardLevel').value) || 1,
            recallCost: parseInt(document.getElementById('createCardRecall').value) || 0,
            _homebrew: true
        };
    } else {
        const cat = document.getElementById('createCardCategory').value;
        cardData = {
            v: 2, ref: null, srdVersion: null,
            name: document.getElementById('createCardGeneralName').value.trim(),
            text: document.getElementById('createCardGeneralDesc').value.trim(),
            features,
            category: cat + '.json',
            domain: '',
            type: '',
            level: undefined,
            recallCost: undefined,
            _homebrew: true
        };
    }

    addCardToSheet(cardData);
    closeCreateCard();
}

// ========== EDIT HOMEBREW CARD ==========
let editCardId = null;
let editCardFeatures = [];

export function openEditCard(id) {
    const el = document.getElementById(id);
    if (!el) return;
    editCardId = id;
    const cardName = el.getAttribute('data-card-name');
    const cd = savedCardsData.find(c => c.name.toLowerCase() === cardName);
    if (!cd) return;

    const isDomain = cd.category === 'domain-cards.json';

    editCardFeatures = (cd.features || []).map(f => ({ name: f.name || '', text: f.text || '' }));

    const fieldsEl = document.getElementById('editCardFields');
    if (isDomain) {
        fieldsEl.innerHTML = `
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Card Name</label><input id="editCardName" type="text" maxlength="80" class="w-full input-field" value="${escAttr(cd.name || '')}"></div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Domain</label>
                    <select id="editCardDomain" class="w-full select-field">${['ARCANA','BLADE','BONE','CODEX','DREAD','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'].map(d => `<option${cd.domain===d?' selected':''}>${d}</option>`).join('')}</select>
                </div>
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Type</label>
                    <select id="editCardDomainType" class="w-full select-field"><option${cd.type==='ABILITY'?' selected':''}>ABILITY</option><option${cd.type==='SPELL'?' selected':''}>SPELL</option><option${cd.type==='GRIMOIRE'?' selected':''}>GRIMOIRE</option></select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Level</label><input id="editCardLevel" type="number" min="1" max="10" class="w-full input-field" value="${escHtmlAttr(cd.level)}"></div>
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Recall Cost</label><input id="editCardRecall" type="number" min="0" max="10" class="w-full input-field" value="${escHtmlAttr(cd.recallCost)}"></div>
            </div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Description</label><textarea id="editCardDesc" rows="3" class="w-full input-field resize-y">${escAttr(cd.text || '')}</textarea></div>`;
    } else {
        fieldsEl.innerHTML = `
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Card Name</label><input id="editCardName" type="text" maxlength="80" class="w-full input-field" value="${escAttr(cd.name || '')}"></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Description</label><textarea id="editCardDesc" rows="3" class="w-full input-field resize-y">${escAttr(cd.text || '')}</textarea></div>`;
    }

    renderEditCardFeatures();
    document.getElementById('editCardModal').classList.remove('hidden');
}

export function closeEditCard() {
    document.getElementById('editCardModal').classList.add('hidden');
    editCardId = null;
}

export function addEditCardFeature() { editCardFeatures.push({ name: '', text: '' }); renderEditCardFeatures(); }
export function removeEditCardFeature(i) { editCardFeatures.splice(i, 1); renderEditCardFeatures(); }
export function updateEditCardFeature(i, field, val) { if (editCardFeatures[i]) editCardFeatures[i][field] = val; }

function renderEditCardFeatures() {
    const el = document.getElementById('editCardFeatureList');
    if (!editCardFeatures.length) { el.innerHTML = '<div class="text-[10px] text-zinc-600 italic">No features</div>'; return; }
    el.innerHTML = editCardFeatures.map((f, i) => `<div class="flex gap-1.5 items-start">
        <input value="${escAttr(f.name)}" onchange="updateEditCardFeature(${i},'name',this.value)" placeholder="Name" class="input-compact text-left px-2 flex-1">
        <textarea onchange="updateEditCardFeature(${i},'text',this.value)" placeholder="Description" rows="2" class="input-compact text-left px-2 flex-[2] resize-y">${escAttr(f.text)}</textarea>
        <button onclick="removeEditCardFeature(${i})" class="btn-remove text-xs mt-1">✕</button>
    </div>`).join('');
}

export function saveEditCard() {
    if (!editCardId) return;
    const el = document.getElementById(editCardId);
    if (!el) return;
    const cardName = el.getAttribute('data-card-name');
    const cd = savedCardsData.find(c => c.name.toLowerCase() === cardName);
    if (!cd) return;

    const isDomain = cd.category === 'domain-cards.json';

    const newName = document.getElementById('editCardName').value.trim();
    if (!newName) { showAlert('Card name is required.'); return; }

    // Update savedCardsData
    const oldKey = cd.name.toLowerCase();
    cd.name = newName;
    cd.features = editCardFeatures.filter(f => f.name.trim() || f.text.trim()).map(f => ({ name: f.name.trim(), text: f.text.trim() }));
    if (isDomain) {
        cd.domain = document.getElementById('editCardDomain').value;
        cd.type = document.getElementById('editCardDomainType').value;
        cd.level = parseInt(document.getElementById('editCardLevel').value) || 1;
        cd.recallCost = parseInt(document.getElementById('editCardRecall').value) || 0;
    }
    const descEl = document.getElementById('editCardDesc');
    if (descEl) cd.text = descEl.value.trim();

    // Update addedCards set
    addedCards.delete(oldKey);
    addedCards.add(newName.toLowerCase());

    // Update selectedDomainCards if renamed
    if (selectedDomainCards.has(oldKey)) {
        selectedDomainCards.delete(oldKey);
        selectedDomainCards.add(newName.toLowerCase());
    }

    // Remove old card and re-render
    el.remove();
    addCardToSheet(cd);

    closeEditCard();
    autoCache();
}

// ========== SHARE HOMEBREW CARD ==========
let shareCardId = null;

export function openShareCard(id) {
    const user = getUser();
    if (!user) { showAlert('Sign in to share cards.'); return; }
    const profile = getProfile();
    if (!profile?.nickname) { showAlert('Set a nickname in your Profile before sharing.'); return; }
    shareCardId = id;
    document.getElementById('shareCardTitle').value = '';
    document.getElementById('shareCardDesc').value = '';
    document.getElementById('shareCardConsent').checked = false;
    document.getElementById('shareCardBtn').disabled = true;
    document.getElementById('shareCardModal').classList.remove('hidden');
}

export function closeShareCard() {
    document.getElementById('shareCardModal').classList.add('hidden');
    shareCardId = null;
}

export function validateShareCard() {
    const title = document.getElementById('shareCardTitle').value.trim();
    const desc = document.getElementById('shareCardDesc').value.trim();
    const consent = document.getElementById('shareCardConsent').checked;
    document.getElementById('shareCardBtn').disabled = !validateShareFields(title, desc, consent);
}

export async function submitShareCard() {
    const user = getUser();
    const profile = getProfile();
    if (!user || !profile?.nickname || !shareCardId) return;
    const sb = getSupabase();

    const el = document.getElementById(shareCardId);
    if (!el) { showAlert('Card not found.'); return; }
    const cardName = el.getAttribute('data-card-name');
    const cardData = savedCardsData.find(c => c.name.toLowerCase() === cardName);
    if (!cardData) { showAlert('Card data not found.'); return; }

    const title = document.getElementById('shareCardTitle').value.trim();
    const description = document.getElementById('shareCardDesc').value.trim();

    // Duplicate check
    const { data: existing } = await sb.from(TABLE_COMMUNITY_HOMEBREW)
        .select('id').eq('author_id', user.id).eq('title', title);
    if (existing && existing.length) { showAlert('You already have a homebrew card with this title.'); return; }

    const isDomain = cardData.category === 'domain-cards.json';
    const cardCategory = isDomain ? null : (cardData.category || '').replace('.json', '') || 'homebrew';

    const { error } = await sb.from(TABLE_COMMUNITY_HOMEBREW).insert({
        author_id: user.id,
        author_nickname: profile.nickname,
        title, description,
        card_type: isDomain ? 'domain-card' : 'general',
        card_category: cardCategory,
        card_data: cardData
    });
    if (error) { showAlert('Share failed: ' + error.message); return; }
    closeShareCard();
    showAlert('Card shared to the community!');
}

export function updateDomainSelection() {
    document.querySelectorAll('#domainCards > div[data-card-name]').forEach(el => {
        const name = el.getAttribute('data-card-name');
        const domainBorder = el.getAttribute('data-domain-border');
        const selBtn = el.querySelector('[id$="-sel"]');
        if (selectedDomainCards.has(name)) {
            el.classList.add('domain-card-selected');
            if (domainBorder) el.style.borderLeftColor = domainBorder;
            if (selBtn) { selBtn.textContent = '★'; selBtn.classList.add('text-yellow-400'); }
        } else {
            el.classList.remove('domain-card-selected');
            el.style.borderLeftColor = '#3d362a';
            if (selBtn) { selBtn.textContent = '☆'; selBtn.classList.remove('text-yellow-400'); }
        }
    });
    document.getElementById('domainSelectCount').textContent = `${selectedDomainCards.size}/5 selected`;
}
