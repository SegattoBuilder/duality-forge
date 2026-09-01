import { escHtml, escHtmlAttr, SAVE_KEY, FEAR_KEY, COUNTERS_KEY, getNextName, hasNameConflict, isVaultActive } from './app.js';
import { vaultCreatures, stashToVault } from './vault.js';

// ========== STATE ==========
let _creatures = [];
let _fearFilled = 0;
let _actionCounters = [];

export function creatures() { return _creatures; }
export function setCreatures(v) { _creatures = v; }
export function fearFilled() { return _fearFilled; }
export function setFearFilled(v) { _fearFilled = v; }
export function actionCounters() { return _actionCounters; }
export function setActionCounters(v) { _actionCounters = v; }

export function autoCache() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(_creatures));
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(_actionCounters));
    localStorage.setItem(FEAR_KEY, String(_fearFilled));
    if (typeof window._markCloudDirty === 'function') window._markCloudDirty();
}

// ========== INIT ==========
export function initTracker() {
    // Enemy search listener
    const enemySearch = document.getElementById('enemySearch');
    if (enemySearch) {
        enemySearch.addEventListener('input', (e) => {
            const results = searchEnemies(e.target.value);
            const container = document.getElementById('enemyResults');
            if (results.length === 0) { container.classList.add('hidden'); return; }
            container.classList.remove('hidden');
            container.innerHTML = results.map(a => {
                const idx = adversariesData.indexOf(a);
                return `<div onclick="window._selectEnemy(${idx})" class="px-4 py-2 text-sm hover:bg-[#2a2418] cursor-pointer border-b border-[#3d362a] last:border-0">
                    <span class="text-[#f5efe6]">${escHtml(a.name)}</span>
                    <span class="text-[10px] text-zinc-500 ml-2">${escHtml(a.type || '')} • T${escHtml(a.tier || '')}</span>
                </div>`;
            }).join('');
        });
    }
}

// ========== ACTION COUNTERS ==========
export function addCounter() {
    _actionCounters.push({ id: 'ac-' + Date.now(), label: 'Action Counter', value: 0 });
    autoCache();
    renderGrid();
}

export function removeCounter(id) {
    if (!confirm('Remove this counter?')) return;
    _actionCounters = _actionCounters.filter(c => c.id !== id);
    autoCache();
    renderGrid();
}

export function stepCounter(id, delta) {
    const c = _actionCounters.find(c => c.id === id);
    if (!c) return;
    c.value = Math.max(0, Math.min(100, c.value + delta));
    autoCache();
    renderCounterCard(c);
}

export function renameCounter(id, val) {
    const c = _actionCounters.find(c => c.id === id);
    if (!c) return;
    c.label = val || 'Action Counter';
    autoCache();
}

function buildCounterCard(c) {
    const atZero = c.value === 0;
    return `<div id="${c.id}" class="creature-card flex flex-col w-48 ${atZero ? 'ring-1 ring-[#d4a01760]' : ''}" style="border-top-color: #d4a017; padding: 12px;">
        <div class="flex justify-between items-center mb-2">
            <input value="${escHtmlAttr(c.label)}" onchange="window._renameCounter('${c.id}', this.value)" class="bg-transparent font-bold text-[11px] uppercase font-[Cinzel] text-[#f5efe6] outline-none border-b border-transparent focus:border-[#d4a017] w-full mr-2">
            <button onclick="window._removeCounter('${c.id}')" class="text-zinc-700 hover:text-red-500 text-xs leading-none flex-shrink-0">✕</button>
        </div>
        <div class="flex items-center justify-center gap-3">
            <button onclick="window._stepCounter('${c.id}', -1)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#3d362a] text-zinc-300 hover:text-white text-sm font-bold">−</button>
            <span class="text-2xl font-black font-[Cinzel] ${atZero ? 'text-[#d4a017]' : 'text-[#f5efe6]'} min-w-[2rem] text-center">${c.value}</span>
            <button onclick="window._stepCounter('${c.id}', 1)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#3d362a] text-zinc-300 hover:text-white text-sm font-bold">+</button>
        </div>
    </div>`;
}

function renderCounterCard(c) {
    const el = document.getElementById(c.id);
    if (!el) return;
    el.outerHTML = buildCounterCard(c);
}

// ========== FEAR POOL ==========
function buildFearDots() {
    let html = '';
    for (let i = 0; i < 12; i++) {
        html += `<div id="fear-${i}" class="dot ${i < _fearFilled ? 'filled-fear' : ''}" onclick="window._toggleFear(${i})"></div>`;
    }
    return html;
}

export function renderFearDots() {
    document.getElementById('fearDots').innerHTML = buildFearDots();
}

function toggleFear(index) {
    _fearFilled = index < _fearFilled ? index : index + 1;
    localStorage.setItem(FEAR_KEY, String(_fearFilled));
    renderFearDots();
}

export function resetFear() {
    _fearFilled = 0;
    localStorage.setItem(FEAR_KEY, '0');
    renderFearDots();
}

// ========== ADVERSARIES DATA (for enemy search) ==========
const ADVERSARIES_URL = 'https://raw.githubusercontent.com/seansbox/daggerheart-srd/main/.build/03_json/adversaries.json';
const ADVERSARIES_CACHE_KEY = 'dh_adversaries_cache';
export let adversariesData = [];
let selectedEnemy = null;

export async function loadAdversaries() {
    const cached = localStorage.getItem(ADVERSARIES_CACHE_KEY);
    if (cached) { try { adversariesData = JSON.parse(cached); return; } catch {} }
    try {
        const r = await fetch(ADVERSARIES_URL);
        adversariesData = await r.json();
        localStorage.setItem(ADVERSARIES_CACHE_KEY, JSON.stringify(adversariesData));
    } catch { adversariesData = []; }
}

function searchEnemies(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return adversariesData.filter(a => a.name.toLowerCase().includes(q)).slice(0, 10);
}

// ========== ADD TYPE MODAL ==========
export function openAddModal() { document.getElementById('addTypeModal').classList.remove('hidden'); }
export function closeAddTypeModal() { document.getElementById('addTypeModal').classList.add('hidden'); }

// ========== CHARACTER MODAL ==========
export function openCharacterModal() {
    document.getElementById('addModal').classList.remove('hidden');
    ['modalName','modalAtk','modalFeatures'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('modalEvasion').value = '10';
    document.getElementById('modalHp').value = '1';
    document.getElementById('modalStress').value = '0';
    document.getElementById('modalHope').value = '0';
    document.getElementById('modalArmor').value = '0';
    document.getElementById('modalQty').value = '1';
    document.getElementById('modalMajor').value = '';
    document.getElementById('modalSevere').value = '';
    document.getElementById('modalName').focus();
}

export function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('addModal').removeAttribute('data-edit-id');
    document.getElementById('modalQtyRow').classList.remove('hidden');
    document.getElementById('modalSubmitBtn').textContent = 'Add';
}

export function editCharacterCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures() : _creatures).find(c => c.id === creatureId);
    if (!creature) return;
    const ed = creature.enemyData;
    const thresholds = ed ? (ed.thresholds || '') : '';
    const [major, severe] = thresholds ? thresholds.split('/').map(s => s.trim()) : ['', ''];
    const featuresText = ed && ed.feature ? ed.feature.map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n') : '';

    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('addModal').setAttribute('data-edit-id', creatureId);
    document.getElementById('modalQtyRow').classList.add('hidden');
    document.getElementById('modalSubmitBtn').textContent = 'Save';
    document.getElementById('modalName').value = creature.name;
    document.getElementById('modalEvasion').value = creature.evasion || '10';
    document.getElementById('modalHp').value = creature.hpMax || '1';
    document.getElementById('modalStress').value = creature.stressMax || '0';
    document.getElementById('modalHope').value = creature.hopeMax || '0';
    document.getElementById('modalArmor').value = creature.armorMax || '0';
    document.getElementById('modalMajor').value = major === '?' ? '' : (major || '');
    document.getElementById('modalSevere').value = severe === '?' ? '' : (severe || '');
    document.getElementById('modalAtk').value = ed ? (ed.attack || '') : '';
    document.getElementById('modalFeatures').value = featuresText;
    document.getElementById('modalName').focus();
}

// ========== ENEMY MODAL ==========
export function openEnemyModal() {
    document.getElementById('enemyModal').classList.remove('hidden');
    document.getElementById('enemySearch').value = '';
    document.getElementById('enemyResults').classList.add('hidden');
    document.getElementById('enemyPreview').classList.add('hidden');
    document.getElementById('enemyQty').value = '1';
    selectedEnemy = null;
    const btn = document.getElementById('enemyAddBtn');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('enemySearch').focus();
    if (adversariesData.length === 0) loadAdversaries();
}

export function closeEnemyModal() { document.getElementById('enemyModal').classList.add('hidden'); }

function selectEnemy(index) {
    selectedEnemy = adversariesData[index];
    document.getElementById('enemySearch').value = selectedEnemy.name;
    document.getElementById('enemyResults').classList.add('hidden');
    const thresholds = selectedEnemy.thresholds || '';
    const [major, severe] = thresholds.split('/').map(s => s.trim());
    document.getElementById('enemyPreview').classList.remove('hidden');
    document.getElementById('enemyPreview').innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(selectedEnemy.name)}</span>
            <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(selectedEnemy.type || '')} • T${escHtml(selectedEnemy.tier || '')}</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-2 text-[10px]">
            <span class="text-blue-300">Difficulty ${escHtml(selectedEnemy.difficulty || '')}</span>
            <span class="text-red-300">HP ${escHtml(selectedEnemy.hp || '')}</span>
            <span class="text-purple-300">Stress ${escHtml(selectedEnemy.stress || '')}</span>
            ${major ? `<span class="text-amber-300">Major ${escHtml(major)}+</span>` : ''}
            ${severe ? `<span class="text-red-400">Severe ${escHtml(severe)}+</span>` : ''}
        </div>
        <div class="text-[10px] text-zinc-500 mb-1">⚔️ ${escHtml(selectedEnemy.attack || '')} ${escHtml(selectedEnemy.damage || '')} (${escHtml(selectedEnemy.range || '')})</div>
        ${selectedEnemy.description ? `<div class="text-[10px] text-zinc-600 italic">${escHtml(selectedEnemy.description)}</div>` : ''}`;
    const btn = document.getElementById('enemyAddBtn');
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// ========== ADD CREATURES (CHARACTER) ==========
export function addCreatures() {
    const name = document.getElementById('modalName').value.trim();
    const evasion = parseInt(document.getElementById('modalEvasion').value) || 0;
    const hp = parseInt(document.getElementById('modalHp').value) || 0;
    const stress = parseInt(document.getElementById('modalStress').value) || 0;
    const hope = parseInt(document.getElementById('modalHope').value) || 0;
    const armor = parseInt(document.getElementById('modalArmor').value) || 0;
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('modalQty').value) || 1));
    const major = document.getElementById('modalMajor').value.trim();
    const severe = document.getElementById('modalSevere').value.trim();
    const atk = document.getElementById('modalAtk').value.trim();
    const featuresRaw = document.getElementById('modalFeatures').value.trim();
    if (!name) { alert('Please enter a name.'); return; }

    const hasExtra = major || severe || atk || featuresRaw;
    let enemyData = null;
    if (hasExtra) {
        const thresholds = (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
        const features = featuresRaw ? featuresRaw.split('\n').filter(l => l.trim()).map(line => {
            const ci = line.indexOf(':');
            return ci > -1 ? { name: line.slice(0, ci).trim(), text: line.slice(ci + 1).trim() } : { name: line.trim(), text: '' };
        }) : [];
        enemyData = { name, difficulty: '', hp: String(hp), stress: String(stress), thresholds, atk: atk.match(/[+-]\d+/)?.[0] || '', attack: atk, damage: '', range: '', description: '', experience: '', motives_and_tactics: '', ability: '', feature: features, type: 'Character', tier: '' };
    }

    const editId = document.getElementById('addModal').getAttribute('data-edit-id');
    if (editId) {
        const creature = _creatures.find(c => c.id === editId) || vaultCreatures().find(c => c.id === editId);
        if (creature) {
            if (hasNameConflict(name, editId)) { alert('Name already in use.'); return; }
            Object.assign(creature, { name, evasion, hpMax: hp, hpFilled: Math.min(creature.hpFilled, hp), stressMax: stress, stressFilled: Math.min(creature.stressFilled, stress), hopeMax: hope, hopeFilled: Math.min(creature.hopeFilled, hope), armorMax: armor, armorFilled: Math.min(creature.armorFilled, armor), enemyData });
            autoCache(); renderCard(creature); closeAddModal(); return;
        }
    }

    const toVault = isVaultActive();
    for (let i = 1; i <= qty; i++) {
        const cName = qty > 1 ? `${name} ${i}` : getNextName(name);
        const c = { id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), name: cName, evasion, hpMax: hp, hpFilled: hp, stressMax: stress, stressFilled: stress, hopeMax: hope, hopeFilled: hope, armorMax: armor, armorFilled: armor };
        if (enemyData) c.enemyData = enemyData;
        if (toVault) { const vc = vaultCreatures(); vc.push(c); } else _creatures.push(c);
    }
    if (toVault) { import('./vault.js').then(m => { m.autoCacheVault(); m.renderVaultGrid(); }); }
    else { autoCache(); renderGrid(); }
    closeAddModal();
}

// ========== ADD ENEMY ==========
export function addEnemy() {
    if (!selectedEnemy) return;
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('enemyQty').value) || 1));
    const hp = parseInt(selectedEnemy.hp) || 1;
    const stress = parseInt(selectedEnemy.stress) || 0;
    const evasion = parseInt(selectedEnemy.difficulty) || 10;
    const toVault = isVaultActive();
    for (let i = 1; i <= qty; i++) {
        const name = qty > 1 ? `${selectedEnemy.name} ${i}` : getNextName(selectedEnemy.name);
        const c = { id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), name, evasion, hpMax: hp, hpFilled: hp, stressMax: stress, stressFilled: stress, hopeMax: 0, hopeFilled: 0, armorMax: 0, armorFilled: 0, enemyData: selectedEnemy };
        if (toVault) { const vc = vaultCreatures(); vc.push(c); } else _creatures.push(c);
    }
    if (toVault) { import('./vault.js').then(m => { m.autoCacheVault(); m.renderVaultGrid(); }); }
    else { autoCache(); renderGrid(); }
    closeEnemyModal();
}

// ========== CUSTOM ATTACK ROWS ==========
export function addCustomAttackRow(name = '', atk = '', damage = '', range = '') {
    const list = document.getElementById('customAttacksList');
    const row = document.createElement('div');
    row.className = 'border border-[#3d362a] rounded-lg p-2 relative';
    row.innerHTML = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <input type="text" placeholder="Name" value="${escHtmlAttr(name)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
        <input type="text" placeholder="ATK" value="${escHtmlAttr(atk)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
        <input type="text" placeholder="Damage" value="${escHtmlAttr(damage)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
        <input type="text" placeholder="Range" value="${escHtmlAttr(range)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
    </div>
    <button type="button" onclick="if(confirm('Remove this attack?'))this.parentElement.remove()" class="absolute top-1 right-1 text-zinc-700 hover:text-red-500 text-xs leading-none">✕</button>`;
    list.appendChild(row);
}

function getCustomAttacks() {
    const attacks = [];
    document.getElementById('customAttacksList').querySelectorAll(':scope > div').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const n = inputs[0].value.trim(), a = inputs[1].value.trim(), d = inputs[2].value.trim(), r = inputs[3].value.trim();
        if (n || d) attacks.push({ name: n, atk: a, damage: d, range: r });
    });
    return attacks;
}

function setCustomAttacks(attacks) {
    document.getElementById('customAttacksList').innerHTML = '';
    if (!attacks || attacks.length === 0) { addCustomAttackRow(); return; }
    attacks.forEach(a => addCustomAttackRow(a.name || '', a.atk || '', a.damage || '', a.range || ''));
}

function enemyDataToAttacks(ed) {
    if (ed.attacks && ed.attacks.length) return ed.attacks;
    if (ed.attack || ed.damage) return [{ name: ed.attack || '', atk: ed.atk || '', damage: ed.damage || '', range: ed.range || '' }];
    return [];
}

// ========== CUSTOM MODAL ==========
export function openCustomModal() {
    document.getElementById('customModal').classList.remove('hidden');
    ['customName','customType','customRange','customMotives','customExperience','customDescription','customFeatures'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('customDifficulty').value = '10';
    document.getElementById('customHp').value = '1';
    document.getElementById('customStress').value = '0';
    document.getElementById('customMajor').value = '';
    document.getElementById('customSevere').value = '';
    document.getElementById('customQty').value = '1';
    setCustomAttacks([]);
    document.getElementById('customName').focus();
}

export function closeCustomModal() {
    document.getElementById('customModal').classList.add('hidden');
    document.getElementById('customModal').removeAttribute('data-edit-id');
    document.getElementById('customModal').removeAttribute('data-edit-type');
    document.getElementById('customQtyRow').classList.remove('hidden');
    document.getElementById('customSubmitBtn').textContent = 'Add';
}

export function editCustomCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures() : _creatures).find(c => c.id === creatureId);
    if (!creature || !creature.enemyData) return;
    const ed = creature.enemyData;
    const [major, severe] = (ed.thresholds || '').split('/').map(s => s.trim());
    const featuresText = (ed.feature || []).map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n');
    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customModal').setAttribute('data-edit-id', creatureId);
    document.getElementById('customModal').setAttribute('data-edit-type', ed.type || 'Custom');
    document.getElementById('customQtyRow').classList.add('hidden');
    document.getElementById('customSubmitBtn').textContent = 'Save';
    document.getElementById('customName').value = creature.name;
    document.getElementById('customDifficulty').value = ed.difficulty || creature.evasion || '10';
    document.getElementById('customHp').value = ed.hp || creature.hpMax || '1';
    document.getElementById('customStress').value = ed.stress || creature.stressMax || '0';
    document.getElementById('customMajor').value = major === '?' ? '' : (major || '');
    document.getElementById('customSevere').value = severe === '?' ? '' : (severe || '');
    document.getElementById('customType').value = ed.type || '';
    document.getElementById('customRange').value = ed.range || '';
    setCustomAttacks(enemyDataToAttacks(ed));
    document.getElementById('customMotives').value = ed.motives_and_tactics || '';
    document.getElementById('customExperience').value = ed.experience || '';
    document.getElementById('customDescription').value = ed.description || '';
    document.getElementById('customFeatures').value = featuresText;
    document.getElementById('customName').focus();
}

export function editEnemyCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures() : _creatures).find(c => c.id === creatureId);
    if (!creature || !creature.enemyData) return;
    document.getElementById('customModal').setAttribute('data-edit-type', 'Enemy (Edited)');
    editCustomCard(creatureId, fromVault);
}

// ========== ADD CUSTOM ==========
export function addCustom() {
    const name = document.getElementById('customName').value.trim();
    if (!name) { alert('Please enter a name.'); return; }
    const difficulty = parseInt(document.getElementById('customDifficulty').value) || 10;
    const hp = parseInt(document.getElementById('customHp').value) || 1;
    const stress = parseInt(document.getElementById('customStress').value) || 0;
    const major = document.getElementById('customMajor').value.trim();
    const severe = document.getElementById('customSevere').value.trim();
    const customType = document.getElementById('customType').value.trim();
    const customRange = document.getElementById('customRange').value.trim();
    const attacks = getCustomAttacks();
    const motives = document.getElementById('customMotives').value.trim();
    const experience = document.getElementById('customExperience').value.trim();
    const description = document.getElementById('customDescription').value.trim();
    const featuresRaw = document.getElementById('customFeatures').value.trim();
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('customQty').value) || 1));
    const thresholds = (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
    const features = featuresRaw ? featuresRaw.split('\n').filter(l => l.trim()).map(line => {
        const ci = line.indexOf(':');
        return ci > -1 ? { name: line.slice(0, ci).trim(), text: line.slice(ci + 1).trim() } : { name: line.trim(), text: '' };
    }) : [];
    const enemyData = { name, difficulty: String(difficulty), hp: String(hp), stress: String(stress), thresholds, atk: attacks.length ? (attacks[0].name.match(/[+-]\d+/)?.[0] || '') : '', attack: attacks.length ? attacks[0].name : '', damage: attacks.length ? attacks[0].damage : '', range: attacks.length ? attacks[0].range : customRange, attacks, description, experience, motives_and_tactics: motives, ability: '', feature: features, type: customType || document.getElementById('customModal').getAttribute('data-edit-type') || 'Custom', tier: '' };

    const editId = document.getElementById('customModal').getAttribute('data-edit-id');
    if (editId) {
        const creature = _creatures.find(c => c.id === editId) || vaultCreatures().find(c => c.id === editId);
        if (creature) {
            if (hasNameConflict(name, editId)) { alert('Name already in use.'); return; }
            Object.assign(creature, { name, evasion: difficulty, hpMax: hp, hpFilled: Math.min(creature.hpFilled, hp), stressMax: stress, stressFilled: Math.min(creature.stressFilled, stress), enemyData });
            autoCache(); renderCard(creature); closeCustomModal(); return;
        }
    }
    const toVault = isVaultActive();
    for (let i = 1; i <= qty; i++) {
        const cName = qty > 1 ? `${name} ${i}` : getNextName(name);
        const c = { id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), name: cName, evasion: difficulty, hpMax: hp, hpFilled: hp, stressMax: stress, stressFilled: stress, hopeMax: 0, hopeFilled: 0, armorMax: 0, armorFilled: 0, enemyData };
        if (toVault) { vaultCreatures().push(c); } else _creatures.push(c);
    }
    if (toVault) { import('./vault.js').then(m => { m.autoCacheVault(); m.renderVaultGrid(); }); }
    else { autoCache(); renderGrid(); }
    closeCustomModal();
}

// ========== CREATURE MANAGEMENT ==========
export function copyCreature(id) {
    const source = _creatures.find(c => c.id === id);
    if (!source) return;
    const copy = { ...JSON.parse(JSON.stringify(source)), id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), name: getNextName(source.name.replace(/ \d+$/, '')), notes: '' };
    _creatures.splice(_creatures.indexOf(source) + 1, 0, copy);
    autoCache(); renderGrid();
}

export function removeCreature(id, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove this creature?')) return;
    _creatures = _creatures.filter(c => c.id !== id);
    autoCache(); renderGrid();
}

function toggleDot(creatureId, type, index) {
    const creature = _creatures.find(c => c.id === creatureId);
    if (!creature) return;
    const key = type + 'Filled';
    creature[key] = index < creature[key] ? index : index + 1;
    autoCache(); renderCard(creature);
}

function adjustMax(creatureId, type, delta) {
    const creature = _creatures.find(c => c.id === creatureId);
    if (!creature) return;
    if (type === 'evasion') { creature.evasion = Math.max(0, Math.min(30, (creature.evasion || 0) + delta)); autoCache(); renderCard(creature); return; }
    const maxKey = type + 'Max', filledKey = type + 'Filled';
    const newMax = (creature[maxKey] || 0) + delta;
    if (newMax < 0 || newMax > 30) return;
    creature[maxKey] = newMax;
    if (creature[filledKey] > newMax) creature[filledKey] = newMax;
    if (delta > 0) creature[filledKey] = Math.min((creature[filledKey] || 0) + 1, newMax);
    autoCache(); renderCard(creature);
}

function renderDots(creature, type) {
    const max = creature[type + 'Max'], filled = creature[type + 'Filled'];
    let html = '';
    for (let i = 0; i < max; i++) html += `<div class="dot ${i < filled ? 'filled-' + type : ''}" onclick="window._toggleDot('${creature.id}', '${type}', ${i})"></div>`;
    return html;
}

function isCreatureDead(creature) { return creature.hpFilled <= 0; }

export function renderCard(creature) {
    const el = document.getElementById(creature.id);
    if (!el) return;
    const dead = isCreatureDead(creature);
    el.className = `creature-card ${dead ? 'dead' : ''}`;
    el.innerHTML = buildCardInner(creature, dead);
}

// ========== CARD INNER HTML ==========
function buildCardInner(creature, dead) {
    const adjBtn = (type, delta) => `<button onclick="window._adjustMax('${creature.id}', '${type}', ${delta})" class="w-4 h-4 flex items-center justify-center rounded bg-[#2a2418] border border-[#3d362a] text-zinc-500 hover:text-white text-[10px] leading-none">${delta < 0 ? '−' : '+'}</button>`;
    const dotRow = (type, label, color) => {
        const max = creature[type + 'Max'] || 0;
        if (max === 0) return '';
        return `<div class="mb-2.5"><div class="flex items-center justify-between mb-1"><div class="flex items-center gap-1.5"><span class="text-[10px] font-bold ${color} uppercase tracking-wide">${label}</span>${adjBtn(type, -1)}${adjBtn(type, 1)}</div><span class="text-[10px] text-zinc-600">${creature[type + 'Filled'] || 0}/${max}</span></div><div class="flex flex-wrap gap-1.5">${renderDots(creature, type)}</div></div>`;
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
            ${features.length ? `<div class="space-y-1.5 mt-2">${features.map(f => `<div><div class="text-xs font-bold text-amber-200">${escHtml(f.name || '')}</div><div class="text-xs text-[#e8e0d4]">${escHtml(f.text || '')}</div></div>`).join('')}</div>` : ''}
        </div>`;
    }
    const typeIcon = dead ? '<span class="text-red-500 text-sm">💀</span>' : (ed ? (ed.type === 'Custom' ? '<span class="text-zinc-600 text-sm">⚙️</span>' : ed.type === 'Enemy (Edited)' ? '<span class="text-zinc-600 text-sm">👹⚙️</span>' : ed.type === 'Character' ? '<span class="text-zinc-600 text-sm">⚔️</span>' : '<span class="text-zinc-600 text-sm">👹</span>') : '<span class="text-zinc-600 text-sm">⚔️</span>');
    const editBtn = ed && (ed.type === 'Custom' || ed.type === 'Enemy (Edited)') ? `<button onclick="window._editCustomCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : (ed && ed.type !== 'Character' ? `<button onclick="window._editEnemyCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : `<button onclick="window._editCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`);

    return `<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">${typeIcon}<span class="font-black text-sm uppercase font-[Cinzel] ${dead ? 'text-zinc-600 line-through' : 'text-[#f5efe6]'}">${creature.name}</span></div>
        <div class="flex items-center gap-2"><button onclick="window._copyCreature('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Duplicate">➕</button><button onclick="window._stashToVault('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Stash to Vault">📦</button>${editBtn}<button onclick="window._flipCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Notes">📝</button><button onclick="window._removeCreature('${creature.id}', event)" class="text-zinc-700 hover:text-red-500 text-sm leading-none" title="Remove">✕</button></div></div>
        ${evasion > 0 ? `<div class="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#2a2418]"><span class="text-[10px] font-bold text-blue-300 uppercase tracking-wide">${ed ? 'Difficulty' : 'Evasion'}</span>${adjBtn('evasion', -1)}<span class="text-sm font-bold text-blue-200">${evasion}</span>${adjBtn('evasion', 1)}</div>` : ''}
        ${dotRow('hp', 'HP', 'text-red-400')}${dotRow('stress', 'Stress', 'text-purple-400')}${dotRow('hope', 'Hope', 'text-amber-400')}${dotRow('armor', 'Armor', 'text-blue-400')}${enemyInfo}`;
}

// ========== CARD FLIP (NOTES) ==========
function flipCard(creatureId) {
    const creature = _creatures.find(c => c.id === creatureId);
    if (!creature) return;
    const el = document.getElementById(creature.id);
    if (!el) return;
    el.innerHTML = `<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2"><span class="text-zinc-600 text-sm">📝</span><span class="font-black text-sm uppercase font-[Cinzel] text-[#f5efe6]">${creature.name}</span></div><button onclick="window._flipBack('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-[10px] uppercase tracking-wide font-bold">← Back</button></div>
        <textarea oninput="window._updateNotes('${creature.id}', this.value)" placeholder="Add notes..." class="w-full h-40 bg-[#1a1714] border border-[#3d362a] rounded-lg px-3 py-2 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-none placeholder-zinc-700">${escHtml(creature.notes || '')}</textarea>`;
}
function flipBack(creatureId) { const c = _creatures.find(c => c.id === creatureId); if (c) renderCard(c); }
function updateNotes(creatureId, value) { const c = _creatures.find(c => c.id === creatureId); if (c) { c.notes = value; autoCache(); } }

// ========== DRAG & DROP ==========
let draggedId = null;
function onDragStart(e, id) { draggedId = id; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; }
function onDragEnd(e) { e.target.style.opacity = ''; draggedId = null; document.querySelectorAll('.creature-card.drag-over').forEach(el => el.classList.remove('drag-over')); }
function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function onDragEnter(e, id) { if (id !== draggedId) { const el = document.getElementById(id); if (el) el.classList.add('drag-over'); } }
function onDragLeave(e, id) { const el = document.getElementById(id); if (el) el.classList.remove('drag-over'); }
function onDrop(e, targetId) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = _creatures.findIndex(c => c.id === draggedId), toIdx = _creatures.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = _creatures.splice(fromIdx, 1);
    _creatures.splice(toIdx, 0, moved);
    autoCache(); renderGrid();
}

// ========== GRID RENDERING ==========
export function renderGrid() {
    const grid = document.getElementById('creatureGrid');
    if (_creatures.length === 0 && _actionCounters.length === 0) {
        grid.innerHTML = '<div id="emptyState" class="col-span-full text-center py-20"><div class="text-zinc-600 text-sm italic">No creatures yet. Click "+ Adversary" to get started.</div></div>';
        return;
    }
    grid.innerHTML = '';
    if (_actionCounters.length > 0) {
        const counterRow = document.createElement('div');
        counterRow.className = 'col-span-full flex flex-wrap gap-3 mb-2';
        _actionCounters.forEach(c => { const div = document.createElement('div'); div.innerHTML = buildCounterCard(c); counterRow.appendChild(div.firstElementChild); });
        grid.appendChild(counterRow);
        const sep = document.createElement('div'); sep.className = 'col-span-full border-b border-[#3d362a] mb-2'; grid.appendChild(sep);
    }
    _creatures.forEach(creature => {
        const dead = isCreatureDead(creature);
        const div = document.createElement('div');
        div.id = creature.id;
        div.className = `creature-card ${dead ? 'dead' : ''}`;
        div.draggable = true;
        div.ondragstart = (e) => onDragStart(e, creature.id);
        div.ondragend = onDragEnd;
        div.ondragover = onDragOver;
        div.ondragenter = (e) => onDragEnter(e, creature.id);
        div.ondragleave = (e) => onDragLeave(e, creature.id);
        div.ondrop = (e) => onDrop(e, creature.id);
        div.innerHTML = buildCardInner(creature, dead);
        grid.appendChild(div);
    });
}

// ========== CLEAR FUNCTIONS ==========
export function clearCreatures(event) { if (event) { event.stopPropagation(); event.preventDefault(); } if (!confirm('Remove all adversaries?')) return; _creatures = []; autoCache(); renderGrid(); }
export function clearCounters(event) { if (event) { event.stopPropagation(); event.preventDefault(); } if (!confirm('Remove all counters?')) return; _actionCounters = []; autoCache(); renderGrid(); }
export function clearAll(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Clear all creatures, counters and fear pool? This cannot be undone.')) return;
    _creatures = []; _actionCounters = []; _fearFilled = 0;
    localStorage.setItem(FEAR_KEY, '0');
    autoCache(); renderFearDots(); renderGrid();
}

// ========== WINDOW BINDINGS (for inline onclick handlers) ==========
window._toggleDot = toggleDot;
window._adjustMax = adjustMax;
window._toggleFear = toggleFear;
window._flipCard = flipCard;
window._flipBack = flipBack;
window._updateNotes = updateNotes;
window._copyCreature = copyCreature;
window._removeCreature = removeCreature;
window._stashToVault = (id) => stashToVault(id);
window._editCharacterCard = (id) => editCharacterCard(id, false);
window._editCustomCard = (id) => editCustomCard(id, false);
window._editEnemyCard = (id) => editEnemyCard(id, false);
window._selectEnemy = selectEnemy;
window._stepCounter = stepCounter;
window._removeCounter = removeCounter;
window._renameCounter = renameCounter;
window.openAddModal = openAddModal;
window.closeAddTypeModal = closeAddTypeModal;
window.openCharacterModal = openCharacterModal;
window.closeAddModal = closeAddModal;
window.openEnemyModal = openEnemyModal;
window.closeEnemyModal = closeEnemyModal;
window.openCustomModal = openCustomModal;
window.closeCustomModal = closeCustomModal;
window.addCreatures = addCreatures;
window.addEnemy = addEnemy;
window.addCustom = addCustom;
window.addCounter = addCounter;
window.addCustomAttackRow = addCustomAttackRow;
window.clearCreatures = clearCreatures;
window.clearCounters = clearCounters;
window.clearAll = clearAll;
window.resetFear = resetFear;
window.onDragOver = onDragOver;
