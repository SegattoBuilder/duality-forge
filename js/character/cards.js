import { GITHUB_RAW, DOMAIN_COLORS, CATEGORY_LABELS, currentData, setCurrentData, addedCards, selectedDomainCards, savedCardsData, setSavedCardsData } from './state.js';
import { autoCache } from './save.js';
import { toggleCard } from './ui.js';
import { showConfirm, showAlert } from '../core/auth.js';

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

function t(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val['en-US']) return val['en-US'];
    return String(val);
}

function domainColor(domain) {
    return DOMAIN_COLORS[domain] || { text: '#a1a1aa', border: '#3f3f46', bg: '#3f3f4620' };
}

function parseDesc(descArr) {
    if (!Array.isArray(descArr)) return t(descArr) || '';
    return descArr.map(d => {
        if (d.paragraph) return `<p>${t(d.paragraph)}</p>`;
        if (d.list) return d.list.map(li => `<p>• ${t(li)}</p>`).join('');
        return t(d);
    }).filter(Boolean).join('');
}

function parseItem(item) {
    const name = t(item.name) || t(item.title) || 'Unnamed Card';
    let desc = parseDesc(item.description) || t(item.text) || t(item.ability) || t(item.effect) || '';
    let feature = '';
    if (Array.isArray(item.features) && item.features.length) {
        feature = item.features.map(f => {
            const fn = t(f.name);
            const fd = parseDesc(f.description);
            if (fn) return `<div class="text-[11px] font-bold text-amber-400 mt-1">${fn}</div><div class="text-[11px] text-zinc-400 leading-relaxed">${fd}</div>`;
            return `<div class="text-[11px] text-zinc-400 leading-relaxed">${fd}</div>`;
        }).join('');
    }
    return { name, desc, feature };
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
    if (!file) return;
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
        const response = await fetch(GITHUB_RAW + file);
        const json = await response.json();

        let data;
        if (Array.isArray(json)) {
            data = json;
        } else {
            const key = Object.keys(json).find(k => Array.isArray(json[k]));
            data = key ? json[key] : [];
        }

        if (file === 'domain-cards.json') {
            data.sort((a, b) => (a.level || 0) - (b.level || 0));
        }

        if (file === 'classes.json') {
            const flat = [];
            data.forEach(cls => {
                const clsName = cls.name || t(cls.name);
                const domains = (cls.domains || []).join(' / ');
                if (cls.hopeFeature) {
                    flat.push({ _display: `${clsName} — Hope Feature`, name: cls.hopeFeature.name, features: [cls.hopeFeature], _classInfo: domains });
                }
                if (Array.isArray(cls.classFeatures)) {
                    cls.classFeatures.forEach(f => {
                        flat.push({ _display: `${clsName} — Class Feature`, name: f.name, features: [f], _classInfo: domains });
                    });
                }
            });
            data = flat;
        }

        if (file === 'subclasses.json') {
            const flat = [];
            data.forEach(sc => {
                const scName = t(sc.name);
                const cls = sc.class || '';
                ['foundation', 'specialization', 'mastery'].forEach(tier => {
                    if (sc[tier] && Array.isArray(sc[tier].features)) {
                        sc[tier].features.forEach(f => {
                            flat.push({ _display: `${scName} — ${tier.charAt(0).toUpperCase() + tier.slice(1)}`, name: f.name, features: [f], _tier: tier, _class: cls });
                        });
                    }
                });
            });
            data = flat;
        }

        setCurrentData(data);
        displayResults(data);
    } catch (e) {
        container.innerHTML = `<div class="text-red-500 text-center p-4">Error: ${e.message}</div>`;
    }
}

export function filterCards() {
    const query = document.getElementById('cardSearch').value.toLowerCase();
    const domainVal = document.getElementById('domainFilter')?.value || '';
    const levelVal = document.getElementById('levelFilter')?.value || '';
    const filtered = currentData.filter(c => {
        const n = t(c.name || c.title || '').toLowerCase();
        const label = (c._display || '').toLowerCase();
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

    const category = document.getElementById('dataType').value;
    const isDomainCards = category === 'domain-cards.json';

    data.forEach((item) => {
        const { name, desc, feature } = parseItem(item);
        const label = item._display || '';
        const tierColors = { foundation: 'text-green-400', specialization: 'text-yellow-400', mastery: 'text-red-400' };
        const tierColor = tierColors[item._tier] || '';
        const dc = isDomainCards ? domainColor(item.domain) : null;

        const cardKey = (label ? `${label}: ${name}` : name).toLowerCase();
        const alreadyAdded = addedCards.has(cardKey);

        const div = document.createElement('div');
        div.className = `p-4 bg-black/60 border rounded-lg mb-2 transition-all ${alreadyAdded ? 'opacity-40 cursor-default' : 'cursor-pointer hover:scale-[1.01]'}`;
        if (dc) {
            div.style.borderColor = dc.border;
            div.style.backgroundColor = dc.bg;
        } else {
            div.classList.add('border-zinc-800');
            if (!alreadyAdded) div.classList.add('hover:border-indigo-500');
        }

        if (!alreadyAdded) {
            div.onclick = () => {
                const skipDesc = ['communities.json','ancestries.json','classes.json'].includes(category);
                addCardToSheet({
                    name: label ? `${label}: ${name}` : name,
                    desc: skipDesc ? '' : desc,
                    feature, category,
                    domain: item.domain || '',
                    type: item.type || '',
                    level: item.level,
                    recallCost: item.recallCost
                });
                closeDatabase();
            };
        }

        const addedBadge = alreadyAdded ? '<span class="text-[9px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">✓ Added</span>' : '';
        const domainBadge = isDomainCards
            ? `<img src="${dc.icon}" class="domain-icon-badge" alt="${item.domain}">
               <span class="text-[10px] font-bold uppercase px-1 rounded" style="color:${dc.text}">${item.domain}</span>
               <span class="text-[10px] text-zinc-500">Lvl ${item.level} · Recall ${item.recallCost}</span>`
            : '';
        const showDesc = !['communities.json','ancestries.json','classes.json'].includes(category);

        div.innerHTML = `
            ${label ? `<div class="text-xs font-bold uppercase ${tierColor} mb-1">${label}${item._classInfo ? ` <span class="text-zinc-500 text-[10px] normal-case">(${item._classInfo})</span>` : ''}</div>` : ''}
            ${domainBadge ? `<div class="flex gap-2 items-center mb-1">${domainBadge}</div>` : ''}
            <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-black uppercase" ${dc ? `style="color:${dc.text}"` : 'class="text-indigo-300"'}>${name}</span>
                ${addedBadge}
            </div>
            ${showDesc ? `<p class="text-xs text-zinc-400 line-clamp-3 leading-relaxed">${desc}</p>` : ''}
            ${feature ? `<p class="text-xs text-zinc-300 mt-1 leading-relaxed">${feature}</p>` : ''}
        `;
        container.appendChild(div);
    });
}

export function addCardToSheet(opts) {
    const { name, desc, feature, category, domain, type, level, recallCost } = opts;
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

    const collapsed = opts.collapsed || false;
    const html = `
    <div class="sheet-card relative mb-2" style="border-left-color:${dc ? '#3d362a' : 'var(--accent-1)'}; ${dc ? `border-top: 2px solid ${dc.border};` : ''}" id="${id}" data-card-name="${cardKey}" data-level="${level || 0}" data-domain-border="${dc ? dc.border : ''}" data-collapsed="${collapsed}">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-1.5 cursor-pointer card-toggle" data-id="${id}">
                <span class="collapse-btn text-zinc-500 text-xs" data-id="${id}">${collapsed ? '▶' : '▼'}</span>
                ${isDomain ? `<button class="text-zinc-600 hover:text-yellow-400 text-base leading-none domain-sel-btn" data-id="${id}" id="${id}-sel" title="Select for loadout">☆</button>` : ''}
                ${dc ? `<img src="${dc.icon}" class="domain-icon-badge" alt="${domain}">` : ''}
                <span class="text-xs font-black uppercase" ${dc ? `style="color:${dc.text}"` : ''}>${name}</span>
            </div>
            <div class="flex items-center gap-2">
                ${isDomain ? `<span class="text-[10px] font-bold uppercase" style="color:${dc.text}">${domain}</span>` : ''}
                ${isDomain ? `<span class="text-[10px] text-zinc-500 whitespace-nowrap">Lvl ${level} | Recall ${recallCost}</span>` : ''}
                ${!isDomain ? `<span class="text-[10px] text-zinc-500 uppercase">${CATEGORY_LABELS[category] || category}</span>` : ''}
                <button class="text-zinc-700 hover:text-red-500 text-sm card-remove" data-id="${id}">✕</button>
            </div>
        </div>
        <div id="${id}-body" class="mt-2" ${collapsed ? 'style="display:none"' : ''}>
            ${feature ? `<div class="leading-relaxed mb-1 text-xs">${feature.replace(/text-zinc-200/g, 'text-amber-400')}</div>` : ''}
            ${desc ? `<div class="text-xs text-zinc-500 leading-relaxed">${desc}</div>` : ''}
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
    cards.sort((a, b) => {
        const aSelected = selectedDomainCards.has(a.getAttribute('data-card-name')) ? 0 : 1;
        const bSelected = selectedDomainCards.has(b.getAttribute('data-card-name')) ? 0 : 1;
        if (aSelected !== bSelected) return aSelected - bSelected;
        return (parseInt(a.getAttribute('data-level')) || 0) - (parseInt(b.getAttribute('data-level')) || 0);
    });
    cards.forEach(c => container.appendChild(c));
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
