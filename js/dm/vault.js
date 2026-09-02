import { escHtml, escHtmlAttr, getNextName, switchTab } from './app.js';
import { creatures, autoCache, renderGrid, editCharacterCard, editCustomCard, editEnemyCard, renderCard } from './tracker.js';
import { showConfirm } from '../core/auth.js';

const VAULT_KEY = 'dh_dm_vault';
const VAULT_GROUPS_KEY = 'dh_dm_vault_groups';
const VAULT_COLLAPSED_KEY = 'dh_dm_vault_collapsed';
let _vaultCreatures = [];
let _vaultGroups = [];
let _collapsedGroups = {};

export function vaultCreatures() { return _vaultCreatures; }
export function setVaultCreatures(v) { _vaultCreatures = v; }
export function vaultGroups() { return _vaultGroups; }
export function setVaultGroups(v) { _vaultGroups = v; }

export function autoCacheVault() {
    localStorage.setItem(VAULT_KEY, JSON.stringify(_vaultCreatures));
    localStorage.setItem(VAULT_GROUPS_KEY, JSON.stringify(_vaultGroups));
    localStorage.setItem(VAULT_COLLAPSED_KEY, JSON.stringify(_collapsedGroups));
    if (typeof window._markCloudDirty === 'function') window._markCloudDirty();
}

export function initVault() {
    try { _vaultCreatures = JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch { _vaultCreatures = []; }
    try {
        const raw = JSON.parse(localStorage.getItem(VAULT_GROUPS_KEY)) || [];
        _vaultGroups = raw.map(g => typeof g === 'string' ? { name: g, disposable: false } : g);
    } catch { _vaultGroups = []; }
    try { _collapsedGroups = JSON.parse(localStorage.getItem(VAULT_COLLAPSED_KEY)) || {}; } catch { _collapsedGroups = {}; }
}

// ========== STASH / DEPLOY ==========
export function stashToVault(id) {
    const c = creatures();
    const idx = c.findIndex(cr => cr.id === id);
    if (idx === -1) return;
    const creature = c[idx];
    showConfirm(`Move ${creature.name} to the vault?`, () => {
        c.splice(idx, 1);
        _vaultCreatures.push(creature);
        autoCache(); autoCacheVault(); renderGrid(); renderVaultGrid();
    });
}

function deployToTracker(id, asIs) {
    const idx = _vaultCreatures.findIndex(c => c.id === id);
    if (idx === -1) return;
    const creature = _vaultCreatures.splice(idx, 1)[0];
    if (!asIs) { creature.hpFilled = creature.hpMax; creature.stressFilled = creature.stressMax; creature.hopeFilled = creature.hopeMax; creature.armorFilled = creature.armorMax; }
    creatures().push(creature);
    autoCache(); autoCacheVault(); renderGrid(); renderVaultGrid();
}

function deployGroupToTracker(group) {
    const groupNames = _vaultGroups.map(g => g.name);
    const members = _vaultCreatures.filter(c => group === '__ungrouped' ? (!c.vaultGroup || !groupNames.includes(c.vaultGroup)) : c.vaultGroup === group);
    if (!members.length) return;
    const label = group === '__ungrouped' ? 'all ungrouped creatures' : `all creatures from &quot;${escHtml(group)}&quot;`;
    const gObj = _vaultGroups.find(g => g.name === group);
    const extra = gObj?.disposable ? `<label class="flex items-center gap-2 mt-3 cursor-pointer"><input type="checkbox" id="deployDeleteGroup" class="accent-[#d4a017]" checked><span class="text-xs text-zinc-400">Delete group after deploy</span></label>` : '';
    showConfirm(`Deploy ${label} to tracker?${extra}`, () => {
        const deleteGroup = gObj?.disposable && document.getElementById('deployDeleteGroup')?.checked;
        members.forEach(c => {
            c.hpFilled = c.hpMax; c.stressFilled = c.stressMax; c.hopeFilled = c.hopeMax; c.armorFilled = c.armorMax;
            creatures().push(c);
        });
        _vaultCreatures = _vaultCreatures.filter(c => !members.includes(c));
        if (deleteGroup) {
            _vaultGroups = _vaultGroups.filter(g => g.name !== group);
            delete _collapsedGroups[group];
        }
        autoCache(); autoCacheVault(); renderGrid(); renderVaultGrid();
        switchTab('tracker');
    });
}

// ========== VAULT CREATURE MANAGEMENT ==========
function removeVaultCreature(id, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const creature = _vaultCreatures.find(c => c.id === id);
    showConfirm(`Remove ${creature ? creature.name : 'this creature'} from vault?`, () => {
        _vaultCreatures = _vaultCreatures.filter(c => c.id !== id);
        autoCacheVault(); renderVaultGrid();
    });
}

function copyVaultCreature(id) {
    const source = _vaultCreatures.find(c => c.id === id);
    if (!source) return;
    const copy = { ...JSON.parse(JSON.stringify(source)), id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), name: getNextName(source.name.replace(/ \d+$/, '')), notes: '' };
    _vaultCreatures.splice(_vaultCreatures.indexOf(source) + 1, 0, copy);
    autoCacheVault(); renderVaultGrid();
}

function toggleVaultDot(creatureId, type, index) {
    const creature = _vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    creature[type + 'Filled'] = index < creature[type + 'Filled'] ? index : index + 1;
    autoCacheVault(); renderVaultCard(creature);
}

function adjustVaultMax(creatureId, type, delta) {
    const creature = _vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    if (type === 'evasion') { creature.evasion = Math.max(0, Math.min(30, (creature.evasion || 0) + delta)); autoCacheVault(); renderVaultCard(creature); return; }
    const maxKey = type + 'Max', filledKey = type + 'Filled';
    const newMax = (creature[maxKey] || 0) + delta;
    if (newMax < 0 || newMax > 30) return;
    creature[maxKey] = newMax;
    if (creature[filledKey] > newMax) creature[filledKey] = newMax;
    if (delta > 0) creature[filledKey] = Math.min((creature[filledKey] || 0) + 1, newMax);
    autoCacheVault(); renderVaultCard(creature);
}

function renderVaultDots(creature, type) {
    const max = creature[type + 'Max'], filled = creature[type + 'Filled'];
    let html = '';
    for (let i = 0; i < max; i++) html += `<div class="dot ${i < filled ? 'filled-' + type : ''}" onclick="window._toggleVaultDot('${creature.id}', '${type}', ${i})"></div>`;
    return html;
}

// ========== VAULT CARD FLIP ==========
function flipVaultCard(creatureId) {
    const creature = _vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    const el = document.getElementById('v-' + creature.id);
    if (!el) return;
    el.innerHTML = `<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2"><span class="text-zinc-600 text-sm">📝</span><span class="font-black text-sm uppercase font-[Cinzel] text-[#f5efe6]">${creature.name}</span></div><button onclick="window._flipVaultBack('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-[10px] uppercase tracking-wide font-bold">← Back</button></div>
        <textarea oninput="window._updateVaultNotes('${creature.id}', this.value)" placeholder="Add notes..." class="w-full h-40 bg-[#1a1714] border border-[#3d362a] rounded-lg px-3 py-2 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-none placeholder-zinc-700">${escHtml(creature.notes || '')}</textarea>`;
}
function flipVaultBack(creatureId) { const c = _vaultCreatures.find(c => c.id === creatureId); if (c) renderVaultCard(c); }
function updateVaultNotes(creatureId, value) { const c = _vaultCreatures.find(c => c.id === creatureId); if (c) { c.notes = value; autoCacheVault(); } }

// ========== VAULT CARD RENDERING ==========
function buildVaultCardInner(creature) {
    const dead = creature.hpFilled <= 0;
    const adjBtn = (type, delta) => `<button onclick="window._adjustVaultMax('${creature.id}', '${type}', ${delta})" class="w-4 h-4 flex items-center justify-center rounded bg-[#2a2418] border border-[#3d362a] text-zinc-500 hover:text-white text-[10px] leading-none">${delta < 0 ? '−' : '+'}</button>`;
    const dotRow = (type, label, color) => {
        const max = creature[type + 'Max'] || 0;
        if (max === 0) return '';
        return `<div class="mb-2.5"><div class="flex items-center justify-between mb-1"><div class="flex items-center gap-1.5"><span class="text-[10px] font-bold ${color} uppercase tracking-wide">${label}</span>${adjBtn(type, -1)}${adjBtn(type, 1)}</div><span class="text-[10px] text-zinc-600">${creature[type + 'Filled'] || 0}/${max}</span></div><div class="flex flex-wrap gap-1.5">${renderVaultDots(creature, type)}</div></div>`;
    };
    const evasion = creature.evasion || 0;
    const ed = creature.enemyData;
    let enemyInfo = '';
    if (ed) {
        const [major, severe] = (ed.thresholds || '').split('/').map(s => s.trim());
        const features = ed.feature || [];
        enemyInfo = `<div class="mt-3 pt-3 border-t border-[#2a2418] space-y-2">
            <div class="flex flex-wrap gap-1.5"><span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(ed.type || '')} • T${escHtml(ed.tier || '')}</span>${major ? `<span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Major ${escHtml(major)}+</span>` : ''}${severe ? `<span class="text-[10px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-300">Severe ${escHtml(severe)}+</span>` : ''}</div>
            <div class="text-xs text-[#e8e0d4]">${(ed.attacks && ed.attacks.length ? ed.attacks : (ed.attack ? [{name: ed.attack, damage: ed.damage, range: ed.range, atk: ed.atk}] : [])).map(a => `⚔️ <span class="font-bold">${escHtml(a.name || '')}</span>${(a.atk || ed.atk) ? ' • ' + escHtml(a.atk || ed.atk || '') : ''} • ${escHtml(a.damage || '')} • ${escHtml(a.range || '')}`).join('<br>')}</div>
            ${ed.experience ? `<div class="text-xs text-[#e8e0d4]">📋 ${escHtml(ed.experience)}</div>` : ''}
            ${ed.motives_and_tactics ? `<div class="text-xs text-[#e8e0d4]">🎯 ${escHtml(ed.motives_and_tactics)}</div>` : ''}
            ${ed.ability ? `<div class="text-xs text-[#e8e0d4]">✨ ${escHtml(ed.ability)}</div>` : ''}
            ${ed.description ? `<div class="text-xs text-zinc-400 italic">${escHtml(ed.description)}</div>` : ''}
            ${features.length ? `<div class="space-y-1.5 mt-2">${features.map(f => `<div><div class="text-xs font-bold text-amber-200">${escHtml(f.name || '')}</div><div class="text-xs text-[#e8e0d4]">${escHtml(f.text || '')}</div></div>`).join('')}</div>` : ''}</div>`;
    }
    let editBtn = '';
    if (ed && (ed.type === 'Custom' || ed.type === 'Enemy (Edited)')) editBtn = `<button onclick="window._editVaultCustomCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    else if (ed && ed.type === 'Character') editBtn = `<button onclick="window._editVaultCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    else if (!ed) editBtn = `<button onclick="window._editVaultCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    else editBtn = `<button onclick="window._editVaultEnemyCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;

    return `<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">${dead ? '<span class="text-red-500 text-sm">💀</span>' : '<span class="text-zinc-600 text-sm">📦</span>'}<span class="font-black text-sm uppercase font-[Cinzel] ${dead ? 'text-zinc-600 line-through' : 'text-[#f5efe6]'}">${creature.name}</span></div>
        <div class="flex items-center gap-2"><button onclick="window._copyVaultCreature('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Duplicate">➕</button>${editBtn}<button onclick="window._flipVaultCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Notes">📝</button><button onclick="window._removeVaultCreature('${creature.id}', event)" class="text-zinc-700 hover:text-red-500 text-sm leading-none" title="Remove">✕</button></div></div>
        ${evasion > 0 ? `<div class="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#2a2418]"><span class="text-[10px] font-bold text-blue-300 uppercase tracking-wide">${ed ? 'Difficulty' : 'Evasion'}</span>${adjBtn('evasion', -1)}<span class="text-sm font-bold text-blue-200">${evasion}</span>${adjBtn('evasion', 1)}</div>` : ''}
        ${dotRow('hp', 'HP', 'text-red-400')}${dotRow('stress', 'Stress', 'text-purple-400')}${dotRow('hope', 'Hope', 'text-amber-400')}${dotRow('armor', 'Armor', 'text-blue-400')}${enemyInfo}
        <div class="mt-3 pt-3 border-t border-[#2a2418] flex gap-2"><button onclick="window._deployToTracker('${creature.id}', false)" class="flex-1 btn-action text-[10px] py-2 rounded-lg font-bold uppercase text-white font-[Cinzel]">⚔️ Deploy</button><button onclick="window._deployToTracker('${creature.id}', true)" class="flex-1 bg-[#2a2418] border border-[#4a3f30] text-[10px] py-2 rounded-lg font-bold uppercase text-zinc-400 font-[Cinzel] hover:border-[#d4a017] hover:text-[#d4a017]">⚔️ As-Is</button></div>`;
}

function renderVaultCard(creature) {
    const el = document.getElementById('v-' + creature.id);
    if (!el) return;
    el.className = `creature-card ${creature.hpFilled <= 0 ? 'dead' : ''}`;
    el.innerHTML = buildVaultCardInner(creature);
}

// ========== VAULT DRAG & DROP ==========
let vaultDraggedId = null;
function onVaultDragStart(e, id) { vaultDraggedId = id; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; }
function onVaultDragEnd(e) { e.target.style.opacity = ''; vaultDraggedId = null; document.querySelectorAll('.vault-group-drop-over').forEach(el => el.classList.remove('vault-group-drop-over')); }
function onVaultDrop(e, targetId) {
    e.preventDefault();
    if (!vaultDraggedId || vaultDraggedId === targetId) return;
    const fromIdx = _vaultCreatures.findIndex(c => c.id === vaultDraggedId), toIdx = _vaultCreatures.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = _vaultCreatures.splice(fromIdx, 1);
    _vaultCreatures.splice(toIdx, 0, moved);
    autoCacheVault(); renderVaultGrid();
}
function onGroupDrop(e, group) {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.classList.remove('vault-group-drop-over');
    if (!vaultDraggedId) return;
    const c = _vaultCreatures.find(c => c.id === vaultDraggedId);
    if (!c) return;
    if (group === '__ungrouped') delete c.vaultGroup; else c.vaultGroup = group;
    autoCacheVault(); renderVaultGrid();
}

// ========== VAULT GROUPS ==========
function addVaultGroup() {
    const input = document.getElementById('vaultGroupInput');
    const name = (input.value || '').trim();
    if (!name || _vaultGroups.some(g => g.name === name)) { input.value = ''; return; }
    const disposable = document.getElementById('vaultGroupDisposable').checked;
    _vaultGroups.push({ name, disposable });
    input.value = '';
    document.getElementById('vaultGroupDisposable').checked = false;
    hideVaultGroupForm();
    autoCacheVault(); renderVaultGrid();
}

function showVaultGroupForm() {
    document.getElementById('vaultGroupForm').classList.remove('hidden');
    document.getElementById('vaultGroupToggle').classList.add('hidden');
    document.getElementById('vaultGroupInput').focus();
}

function hideVaultGroupForm() {
    document.getElementById('vaultGroupForm').classList.add('hidden');
    document.getElementById('vaultGroupToggle').classList.remove('hidden');
    document.getElementById('vaultGroupInput').value = '';
}

function renameVaultGroup(oldName) {
    const newName = prompt('Rename group:', oldName);
    if (!newName || newName.trim() === oldName || _vaultGroups.some(g => g.name === newName.trim())) return;
    const trimmed = newName.trim();
    const gObj = _vaultGroups.find(g => g.name === oldName);
    if (gObj) gObj.name = trimmed;
    _vaultCreatures.forEach(c => { if (c.vaultGroup === oldName) c.vaultGroup = trimmed; });
    autoCacheVault(); renderVaultGrid();
}

function removeVaultGroup(name) {
    _vaultGroups = _vaultGroups.filter(g => g.name !== name);
    _vaultCreatures.forEach(c => { if (c.vaultGroup === name) delete c.vaultGroup; });
    delete _collapsedGroups[name];
    autoCacheVault(); renderVaultGrid();
}

function toggleVaultGroupCollapse(name) {
    _collapsedGroups[name] = !_collapsedGroups[name];
    localStorage.setItem(VAULT_COLLAPSED_KEY, JSON.stringify(_collapsedGroups));
    renderVaultGrid();
}

function assignVaultGroup(creatureId, group) {
    const c = _vaultCreatures.find(c => c.id === creatureId);
    if (!c) return;
    if (group) c.vaultGroup = group; else delete c.vaultGroup;
    autoCacheVault(); renderVaultGrid();
}

function renderVaultGroupCards(list, container) {
    list.forEach(creature => {
        const div = document.createElement('div');
        div.id = 'v-' + creature.id;
        div.className = `creature-card ${creature.hpFilled <= 0 ? 'dead' : ''}`;
        div.draggable = true;
        div.ondragstart = (e) => onVaultDragStart(e, creature.id);
        div.ondragend = onVaultDragEnd;
        div.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
        div.ondragenter = () => { if (creature.id !== vaultDraggedId) div.classList.add('drag-over'); };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => onVaultDrop(e, creature.id);
        div.innerHTML = buildVaultCardInner(creature);
        container.appendChild(div);
    });
}

// ========== VAULT GRID ==========
export function renderVaultGrid() {
    const grid = document.getElementById('vaultGrid');
    if (_vaultCreatures.length === 0 && _vaultGroups.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-20"><div class="text-zinc-600 text-sm italic">Vault is empty. Use 📦 on tracker cards to stash creatures here.</div></div>';
        return;
    }
    grid.innerHTML = '';

    if (_vaultGroups.length === 0) {
        renderVaultGroupCards(_vaultCreatures, grid);
        return;
    }

    const ungrouped = _vaultCreatures.filter(c => !c.vaultGroup || !_vaultGroups.some(g => g.name === c.vaultGroup));

    _vaultGroups.forEach(({ name: group, disposable }) => {
        const members = _vaultCreatures.filter(c => c.vaultGroup === group);
        const collapsed = !!_collapsedGroups[group];
        const section = document.createElement('div');
        section.className = 'col-span-full';
        section.innerHTML = `<div class="flex items-center gap-2 mb-3 mt-4 first:mt-0 cursor-pointer select-none rounded-lg px-2 py-1 transition-colors" onclick="window._toggleVaultGroupCollapse('${escHtmlAttr(group)}')"
            ondragover="event.preventDefault(); event.dataTransfer.dropEffect='move'; this.classList.add('vault-group-drop-over')"
            ondragleave="this.classList.remove('vault-group-drop-over')"
            ondrop="window._onGroupDrop(event, '${escHtmlAttr(group)}')">
            <span class="text-zinc-500 text-xs transition-transform ${collapsed ? '' : 'rotate-90'}" style="display:inline-block">▶</span>
            <span class="font-[Cinzel] text-xs uppercase tracking-widest font-bold" style="color: var(--accent-1)">${escHtml(group)}</span>
            <span class="text-[10px] text-zinc-600">(${members.length})</span>
            ${disposable ? '<span class="text-[10px] text-zinc-700" title="Disposable">🗑</span>' : ''}
            <button onclick="event.stopPropagation(); window._renameVaultGroup('${escHtmlAttr(group)}')" class="text-zinc-600 hover:text-[#d4a017] text-[10px]" title="Rename">✏️</button>
            <button onclick="event.stopPropagation(); window._removeVaultGroup('${escHtmlAttr(group)}')" class="text-zinc-700 hover:text-red-500 text-[10px]" title="Remove group">✕</button>
            <div class="flex-1 border-t border-[#3d362a]"></div>
            ${members.length ? `<button onclick="event.stopPropagation(); window._deployGroupToTracker('${escHtmlAttr(group)}')" class="btn-action text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase text-white font-[Cinzel] whitespace-nowrap">⚔️ Deploy All</button>` : ''}
        </div>`;
        grid.appendChild(section);
        if (!collapsed) {
            const subgrid = document.createElement('div');
            subgrid.className = 'col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2';
            if (members.length === 0) {
                subgrid.innerHTML = '<div class="col-span-full text-center py-4"><div class="text-zinc-700 text-xs italic">No creatures in this group.</div></div>';
            } else {
                renderVaultGroupCards(members, subgrid);
            }
            grid.appendChild(subgrid);
        }
    });

    if (ungrouped.length > 0) {
        const uCollapsed = !!_collapsedGroups['__ungrouped'];
        const section = document.createElement('div');
        section.className = 'col-span-full';
        section.innerHTML = `<div class="flex items-center gap-2 mb-3 mt-4 cursor-pointer select-none rounded-lg px-2 py-1 transition-colors" onclick="window._toggleVaultGroupCollapse('__ungrouped')"
            ondragover="event.preventDefault(); event.dataTransfer.dropEffect='move'; this.classList.add('vault-group-drop-over')"
            ondragleave="this.classList.remove('vault-group-drop-over')"
            ondrop="window._onGroupDrop(event, '__ungrouped')">
            <span class="text-zinc-500 text-xs transition-transform ${uCollapsed ? '' : 'rotate-90'}" style="display:inline-block">▶</span>
            <span class="font-[Cinzel] text-xs uppercase tracking-widest font-bold text-zinc-500">Ungrouped</span>
            <span class="text-[10px] text-zinc-600">(${ungrouped.length})</span>
            <div class="flex-1 border-t border-[#3d362a]"></div>
            <button onclick="event.stopPropagation(); window._deployGroupToTracker('__ungrouped')" class="btn-action text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase text-white font-[Cinzel] whitespace-nowrap">⚔️ Deploy All</button>
        </div>`;
        grid.appendChild(section);
        if (!uCollapsed) {
            const subgrid = document.createElement('div');
            subgrid.className = 'col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2';
            renderVaultGroupCards(ungrouped, subgrid);
            grid.appendChild(subgrid);
        }
    }
}

export function clearVault(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    showConfirm('Clear entire vault (creatures and groups)? This cannot be undone.', () => {
        _vaultCreatures = []; _vaultGroups = []; _collapsedGroups = {};
        autoCacheVault(); renderVaultGrid();
    });
}

// ========== WINDOW BINDINGS ==========
window._toggleVaultDot = toggleVaultDot;
window._adjustVaultMax = adjustVaultMax;
window._flipVaultCard = flipVaultCard;
window._flipVaultBack = flipVaultBack;
window._updateVaultNotes = updateVaultNotes;
window._copyVaultCreature = copyVaultCreature;
window._removeVaultCreature = removeVaultCreature;
window._deployToTracker = deployToTracker;
window._editVaultCharacterCard = (id) => editCharacterCard(id, true);
window._editVaultCustomCard = (id) => editCustomCard(id, true);
window._editVaultEnemyCard = (id) => editEnemyCard(id, true);
window.clearVault = clearVault;
window._addVaultGroup = addVaultGroup;
window._showVaultGroupForm = showVaultGroupForm;
window._hideVaultGroupForm = hideVaultGroupForm;
window._renameVaultGroup = renameVaultGroup;
window._removeVaultGroup = removeVaultGroup;
window._assignVaultGroup = assignVaultGroup;
window._toggleVaultGroupCollapse = toggleVaultGroupCollapse;
window._deployGroupToTracker = deployGroupToTracker;
window._onGroupDrop = onGroupDrop;
