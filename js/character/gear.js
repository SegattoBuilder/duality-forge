import { autoCache } from './save.js';
import { showConfirm } from '../core/auth.js';

const TRAIT_OPTIONS = '<option value="">—</option><option value="t_agi">Agility</option><option value="t_str">Strength</option><option value="t_fin">Finesse</option><option value="t_inst">Instinct</option><option value="t_pres">Presence</option><option value="t_know">Knowledge</option>';

function clearEmpty(container) {
    if (container.innerText.trim() === 'None') container.innerHTML = '';
}

function showEmpty(container) {
    if (!container.children.length) container.innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
}

function applyEquipStyle(el, equipped) {
    el.style.opacity = equipped ? '1' : '0.4';
    el.querySelector('.equip-star').textContent = equipped ? '★' : '☆';
}

function toggleCollapse(id) {
    const el = document.getElementById(id);
    const details = el.querySelector('.gear-details');
    const btn = el.querySelector('.collapse-btn');
    const collapsed = details.style.display !== 'none';
    details.style.display = collapsed ? 'none' : '';
    btn.textContent = collapsed ? '▶' : '▼';
    el.dataset.collapsed = collapsed;
    autoCache();
}

function applyCollapsed(el, collapsed) {
    if (!collapsed) return;
    const details = el.querySelector('.gear-details');
    const btn = el.querySelector('.collapse-btn');
    if (details) details.style.display = 'none';
    if (btn) btn.textContent = '▶';
    el.dataset.collapsed = 'true';
}

// ========== WEAPONS ==========

export function addWeapon(data) {
    const d = data || {};
    const container = document.getElementById('weaponList');
    clearEmpty(container);
    const id = 'wep-' + Math.random().toString(36).substr(2, 9);
    const equipped = d.equipped !== undefined ? d.equipped : (container.children.length === 0);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3" id="${id}" data-equipped="${equipped}" data-collapsed="false">
        <div class="flex items-center gap-2">
            <span class="collapse-btn text-zinc-500 text-xs" title="Collapse">▼</span>
            <button class="equip-star text-lg leading-none cursor-pointer" title="Equip">${equipped ? '★' : '☆'}</button>
            <input type="text" value="${d.name || ''}" placeholder="Weapon Name" class="flex-1 bg-transparent text-sm font-bold outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm wep-remove" title="Remove">✕</button>
        </div>
        <div class="gear-details mt-2">
            <div class="grid grid-cols-4 gap-2 text-zinc-500">
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">TRAIT</div><select class="wep-trait w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-xs" data-autocache>${TRAIT_OPTIONS}</select></div>
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">RANGE</div><input type="text" value="${d.range || ''}" placeholder="—" class="w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-xs" data-autocache></div>
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">DAMAGE</div><input type="text" value="${d.dmg || ''}" placeholder="—" class="w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-xs" data-autocache></div>
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">ATK BONUS</div><div class="wep-atk w-full bg-gray-800 border border-gray-700 rounded py-1.5 text-center font-bold text-indigo-400 text-sm">—</div></div>
            </div>
            <div class="mt-2"><div class="text-[10px] text-zinc-600 mb-1">FEATURE</div><input type="text" value="${d.feature || ''}" placeholder="Weapon feature..." class="w-full bg-black/40 border border-zinc-800 rounded px-3 py-1.5 text-xs outline-none" data-autocache></div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    if (d.trait) el.querySelector('.wep-trait').value = d.trait;
    applyEquipStyle(el, equipped);
    if (d.collapsed) applyCollapsed(el, true);
    el.querySelector('.collapse-btn').addEventListener('click', () => toggleCollapse(id));
    el.querySelector('.equip-star').addEventListener('click', () => toggleEquipWeapon(id));
    el.querySelector('.wep-remove').addEventListener('click', () => removeWeapon(id));
    el.querySelector('.wep-trait').addEventListener('change', () => { window.updateAttackBonus(); autoCache(); });
    if (!data) autoCache();
}

function toggleEquipWeapon(id) {
    const el = document.getElementById(id);
    const wasEquipped = el.dataset.equipped === 'true';
    document.querySelectorAll('#weaponList > div[id^="wep-"]').forEach(w => {
        w.dataset.equipped = 'false';
        applyEquipStyle(w, false);
    });
    if (!wasEquipped) {
        el.dataset.equipped = 'true';
        applyEquipStyle(el, true);
    }
    window.updateAttackBonus();
    autoCache();
}

function removeWeapon(id) {
    showConfirm('Remove this weapon?', () => {
        document.getElementById(id).remove();
        showEmpty(document.getElementById('weaponList'));
        window.updateAttackBonus();
        autoCache();
    });
}

export function getWeaponData() {
    const items = [];
    document.querySelectorAll('#weaponList > div[id^="wep-"]').forEach(el => {
        const inputs = el.querySelectorAll('input[type="text"]');
        items.push({
            name: inputs[0].value, trait: el.querySelector('.wep-trait').value,
            range: inputs[1].value, dmg: inputs[2].value, feature: inputs[3].value,
            equipped: el.dataset.equipped === 'true',
            collapsed: el.dataset.collapsed === 'true'
        });
    });
    return items;
}

export function getEquippedWeapon() {
    const el = document.querySelector('#weaponList > div[data-equipped="true"]');
    if (!el) return null;
    return { trait: el.querySelector('.wep-trait').value, atk: el.querySelector('.wep-atk') };
}

// ========== ARMOR ==========

export function addArmor(data) {
    const d = data || {};
    const container = document.getElementById('armorList');
    clearEmpty(container);
    const id = 'arm-' + Math.random().toString(36).substr(2, 9);
    const equipped = d.equipped !== undefined ? d.equipped : (container.children.length === 0);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3" id="${id}" data-equipped="${equipped}" data-collapsed="false">
        <div class="flex items-center gap-2">
            <span class="collapse-btn text-zinc-500 text-xs" title="Collapse">▼</span>
            <button class="equip-star text-lg leading-none cursor-pointer" title="Equip">${equipped ? '★' : '☆'}</button>
            <input type="text" value="${d.name || ''}" placeholder="Armor Name" class="flex-1 bg-transparent text-sm font-bold outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm arm-remove" title="Remove">✕</button>
        </div>
        <div class="gear-details mt-2">
            <div class="grid grid-cols-3 gap-2 text-zinc-500">
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">MAJOR</div><input type="number" value="${d.major || '0'}" placeholder="0" class="arm-major w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-sm" data-autocache></div>
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">SEVERE</div><input type="number" value="${d.severe || '0'}" placeholder="0" class="arm-severe w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-sm" data-autocache></div>
                <div class="text-center"><div class="text-[10px] text-zinc-600 mb-1">SCORE</div><input type="text" value="${d.score || ''}" placeholder="0" class="w-full bg-black/40 border border-zinc-800 rounded px-1 py-1.5 text-center outline-none text-sm" data-autocache></div>
            </div>
            <div class="mt-2"><div class="text-[10px] text-zinc-600 mb-1">FEATURE</div><input type="text" value="${d.feature || ''}" placeholder="Armor feature..." class="w-full bg-black/40 border border-zinc-800 rounded px-3 py-1.5 text-xs outline-none" data-autocache></div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    applyEquipStyle(el, equipped);
    if (d.collapsed) applyCollapsed(el, true);
    el.querySelector('.collapse-btn').addEventListener('click', () => toggleCollapse(id));
    el.querySelector('.equip-star').addEventListener('click', () => toggleEquipArmor(id));
    el.querySelector('.arm-remove').addEventListener('click', () => removeArmor(id));
    el.querySelector('.arm-major').addEventListener('input', () => { window.updateThresholds(); autoCache(); });
    el.querySelector('.arm-severe').addEventListener('input', () => { window.updateThresholds(); autoCache(); });
    if (!data) autoCache();
}

function toggleEquipArmor(id) {
    const el = document.getElementById(id);
    const wasEquipped = el.dataset.equipped === 'true';
    document.querySelectorAll('#armorList > div[id^="arm-"]').forEach(a => {
        a.dataset.equipped = 'false';
        applyEquipStyle(a, false);
    });
    if (!wasEquipped) {
        el.dataset.equipped = 'true';
        applyEquipStyle(el, true);
    }
    window.updateThresholds();
    autoCache();
}

function removeArmor(id) {
    showConfirm('Remove this armor?', () => {
        document.getElementById(id).remove();
        showEmpty(document.getElementById('armorList'));
        window.updateThresholds();
        autoCache();
    });
}

export function getArmorData() {
    const items = [];
    document.querySelectorAll('#armorList > div[id^="arm-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        items.push({
            name: inputs[0].value, major: inputs[1].value, severe: inputs[2].value,
            score: inputs[3].value, feature: inputs[4].value,
            equipped: el.dataset.equipped === 'true',
            collapsed: el.dataset.collapsed === 'true'
        });
    });
    return items;
}

export function getEquippedArmor() {
    const el = document.querySelector('#armorList > div[data-equipped="true"]');
    if (!el) return { major: 0, severe: 0 };
    return {
        major: parseInt(el.querySelector('.arm-major').value) || 0,
        severe: parseInt(el.querySelector('.arm-severe').value) || 0
    };
}

// ========== ITEMS ==========

export function addItem(data) {
    const d = data || {};
    const container = document.getElementById('itemList');
    clearEmpty(container);
    const id = 'item-' + Math.random().toString(36).substr(2, 9);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3" id="${id}" data-collapsed="false">
        <div class="flex items-center gap-2">
            <span class="collapse-btn text-zinc-500 text-xs" title="Collapse">▼</span>
            <input type="text" value="${d.name || ''}" placeholder="Item name..." class="flex-1 bg-transparent text-sm font-bold outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm item-remove" title="Remove">✕</button>
        </div>
        <div class="gear-details mt-1"><input type="text" value="${d.desc || ''}" placeholder="Description..." class="w-full bg-transparent border-b border-zinc-800 px-1 py-1 text-xs outline-none text-zinc-400" data-autocache></div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    if (d.collapsed) applyCollapsed(el, true);
    el.querySelector('.collapse-btn').addEventListener('click', () => toggleCollapse(id));
    el.querySelector('.item-remove').addEventListener('click', () => removeItem(id));
    if (!data) autoCache();
}

function removeItem(id) {
    showConfirm('Remove this item?', () => {
        document.getElementById(id).remove();
        showEmpty(document.getElementById('itemList'));
        autoCache();
    });
}

export function getItemData() {
    const items = [];
    document.querySelectorAll('#itemList > div[id^="item-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        items.push({ name: inputs[0].value, desc: inputs[1].value, collapsed: el.dataset.collapsed === 'true' });
    });
    return items;
}

// ========== CONSUMABLES ==========

export function addConsumable(data) {
    const d = data || {};
    const container = document.getElementById('consumableList');
    clearEmpty(container);
    const id = 'cons-' + Math.random().toString(36).substr(2, 9);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3" id="${id}" data-collapsed="false">
        <div class="flex items-center gap-2">
            <span class="collapse-btn text-zinc-500 text-xs" title="Collapse">▼</span>
            <input type="text" value="${d.name || ''}" placeholder="Consumable name..." class="flex-1 bg-transparent text-sm font-bold outline-none" data-autocache>
            <input type="text" value="${d.qty || '1'}" placeholder="x1" class="w-10 bg-transparent text-center text-sm outline-none border-b border-zinc-800" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm cons-remove" title="Remove">✕</button>
        </div>
        <div class="gear-details mt-1"><input type="text" value="${d.desc || ''}" placeholder="Effect..." class="w-full bg-transparent border-b border-zinc-800 px-1 py-1 text-xs outline-none text-zinc-400" data-autocache></div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    if (d.collapsed) applyCollapsed(el, true);
    el.querySelector('.collapse-btn').addEventListener('click', () => toggleCollapse(id));
    el.querySelector('.cons-remove').addEventListener('click', () => removeConsumable(id));
    if (!data) autoCache();
}

function removeConsumable(id) {
    showConfirm('Remove this consumable?', () => {
        document.getElementById(id).remove();
        showEmpty(document.getElementById('consumableList'));
        autoCache();
    });
}

export function getConsumableData() {
    const items = [];
    document.querySelectorAll('#consumableList > div[id^="cons-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        items.push({ name: inputs[0].value, qty: inputs[1].value, desc: inputs[2].value, collapsed: el.dataset.collapsed === 'true' });
    });
    return items;
}

// ========== ADDITIONAL GEAR ==========

export function addGearItem(name, bonus, desc, collapsed) {
    const container = document.getElementById('gearItemList');
    clearEmpty(container);
    const id = 'gear-' + Math.random().toString(36).substr(2, 9);
    const html = `
    <div class="bg-black/40 border border-zinc-800 rounded-lg p-3" id="${id}" data-collapsed="false">
        <div class="flex items-center gap-2">
            <span class="collapse-btn text-zinc-500 text-xs" title="Collapse">▼</span>
            <input type="text" value="${name || ''}" placeholder="Item name..." class="flex-1 bg-transparent text-sm font-bold outline-none" data-autocache>
            <input type="text" value="${bonus || ''}" placeholder="Bonus" class="w-20 bg-transparent border-b border-zinc-700 text-sm text-center outline-none" data-autocache>
            <button class="text-zinc-700 hover:text-red-500 text-sm gear-remove">✕</button>
        </div>
        <div class="gear-details mt-1"><textarea placeholder="Description..." class="w-full bg-transparent border border-zinc-800 rounded px-2 py-1.5 text-xs outline-none resize-none h-12" data-autocache>${desc || ''}</textarea></div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    if (collapsed) applyCollapsed(el, true);
    el.querySelector('.collapse-btn').addEventListener('click', () => toggleCollapse(id));
    el.querySelector('.gear-remove').addEventListener('click', () => removeGearItem(id));
    if (!name && !bonus && !desc) autoCache();
}

export function removeGearItem(id) {
    showConfirm('Remove this item?', () => {
        document.getElementById(id).remove();
        showEmpty(document.getElementById('gearItemList'));
        autoCache();
    });
}

export function getGearData() {
    const items = [];
    document.querySelectorAll('#gearItemList > div[id^="gear-"]').forEach(el => {
        const inputs = el.querySelectorAll('input');
        const textarea = el.querySelector('textarea');
        items.push({ name: inputs[0].value, bonus: inputs[1].value, desc: textarea.value, collapsed: el.dataset.collapsed === 'true' });
    });
    return items;
}
