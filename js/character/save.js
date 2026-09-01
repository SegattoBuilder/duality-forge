import { SAVE_KEY, EXPORT_KEY, THEME_KEY, FIELD_IDS, TEXTAREA_IDS, _restoring, setRestoring, addedCards, selectedDomainCards, savedCardsData, setSavedCardsData } from './state.js';
import { getDotStates, setDotStates, renderDots, updateThresholds, updateAttackBonus } from './trackers.js';
import { addCardToSheet, updateDomainSelection, reorderDomainCards } from './cards.js';
import { addExperience, getExperienceData } from './experience.js';
import { addInventoryItem, getInventoryData } from './inventory.js';
import { addGearItem, getGearData, addWeapon, getWeaponData, addArmor, getArmorData, addItem, getItemData, addConsumable, getConsumableData } from './gear.js';
import { applyTheme } from './theme.js';

import { showConfirm } from '../core/auth.js';

export function autoCache() {
    if (_restoring) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(gatherData()));
}

export function gatherData() {
    const data = {
        fields: {}, textareas: {}, dots: getDotStates(),
        cards: savedCardsData, experience: getExperienceData(),
        inventory: getInventoryData(), gear: getGearData(),
        weapons: getWeaponData(), armors: getArmorData(),
        items: getItemData(), consumables: getConsumableData(),
        selectedDomain: Array.from(selectedDomainCards),
        theme: localStorage.getItem(THEME_KEY) || 'gold',
        lastExport: localStorage.getItem(EXPORT_KEY) || null
    };
    FIELD_IDS.forEach(id => { const el = document.getElementById(id); if (el) data.fields[id] = el.value; });
    TEXTAREA_IDS.forEach(id => { const el = document.getElementById(id); if (el) data.textareas[id] = el.value; });
    return data;
}

export function applyData(data) {
    setRestoring(true);
    try {
        FIELD_IDS.forEach(id => { const el = document.getElementById(id); if (el && data.fields?.[id] !== undefined) el.value = data.fields[id]; });
        TEXTAREA_IDS.forEach(id => { const el = document.getElementById(id); if (el && data.textareas?.[id] !== undefined) el.value = data.textareas[id]; });
        ['hp','stress','hope','armor'].forEach(t => renderDots(t, document.getElementById(`${t}_max`)?.value || 0));
        setDotStates(data.dots);
        document.getElementById('domainCards').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
        document.getElementById('generalCards').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
        addedCards.clear();
        setSavedCardsData(data.cards || []);
        savedCardsData.forEach(c => addCardToSheet(c));
        document.getElementById('experienceList').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
        if (data.experience && data.experience.length) {
            data.experience.forEach(e => addExperience(e.name, e.value, e.desc));
        }
        document.getElementById('inventoryList').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
        if (data.inventory && data.inventory.length) {
            data.inventory.forEach(item => {
                if (typeof item === 'string') addInventoryItem(item, '1');
                else addInventoryItem(item.name, item.qty);
            });
        }
        document.getElementById('gearItemList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
        if (data.gear && data.gear.length) {
            data.gear.forEach(g => addGearItem(g.name, g.bonus, g.desc, g.collapsed));
        }
        // Dynamic items
        document.getElementById('itemList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
        if (data.items && data.items.length) {
            data.items.forEach(i => addItem(i));
        }
        // Dynamic consumables
        document.getElementById('consumableList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
        if (data.consumables && data.consumables.length) {
            data.consumables.forEach(c => addConsumable(c));
        }
        // Dynamic weapons
        document.getElementById('weaponList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
        if (data.weapons && data.weapons.length) {
            data.weapons.forEach(w => addWeapon(w));
        } else if (data.fields) {
            // Backward compat: migrate old fixed weapon slots
            [1, 2].forEach(n => {
                const name = data.fields[`wep${n}_name`];
                if (name) addWeapon({ name, trait: data.fields[`wep${n}_trait`] || '', range: data.fields[`wep${n}_range`] || '', dmg: data.fields[`wep${n}_dmg`] || '', feature: data.fields[`wep${n}_feature`] || '', equipped: n === 1 });
            });
        }
        // Dynamic armors
        document.getElementById('armorList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
        if (data.armors && data.armors.length) {
            data.armors.forEach(a => addArmor(a));
        } else if (data.fields) {
            // Backward compat: migrate old fixed armor slot
            const aName = data.fields['armor_name'];
            if (aName) addArmor({ name: aName, major: data.fields['armor_thresh_major'] || '0', severe: data.fields['armor_thresh_severe'] || '0', score: data.fields['armor_score'] || '', feature: data.fields['armor_feature'] || '', equipped: true });
        }
        updateThresholds();
        if (data.theme) applyTheme(data.theme);
        selectedDomainCards.clear();
        if (data.selectedDomain && data.selectedDomain.length) {
            data.selectedDomain.forEach(name => selectedDomainCards.add(name));
            updateDomainSelection();
            reorderDomainCards();
        }
    } finally {
        setRestoring(false);
    }
}

export function saveSheet() {
    const data = gatherData();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const charName = data.fields.charName || 'character';
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${charName}_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(EXPORT_KEY, Date.now().toString());
    showToast('✓ Exported!');
}

export function loadSheet(silent) {
    if (!silent) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.lastExport) localStorage.setItem(EXPORT_KEY, data.lastExport);
                    applyData(data);
                    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
                    updateExportIndicator();
                    showToast('Sheet loaded!');
                } catch { showToast('Invalid file.'); }
            };
            reader.readAsText(file);
        };
        input.click();
        return;
    }
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    applyData(JSON.parse(raw));
}

export function resetSheet() {
    localStorage.removeItem(SAVE_KEY);
    FIELD_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = el.type === 'number' ? '0' : ''; });
    document.getElementById('track_ev').value = '10';
    document.getElementById('charLevel').value = '1';
    document.getElementById('hp_max').value = '6';
    document.getElementById('stress_max').value = '6';
    document.getElementById('hope_max').value = '6';
    document.getElementById('armor_max').value = '3';
    TEXTAREA_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['hp','stress','hope','armor'].forEach(t => renderDots(t, document.getElementById(`${t}_max`)?.value || 0));
    document.getElementById('domainCards').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    document.getElementById('generalCards').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    addedCards.clear();
    setSavedCardsData([]);
    selectedDomainCards.clear();
    document.getElementById('domainSelectCount').textContent = '0/5 selected';
    document.getElementById('experienceList').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    document.getElementById('inventoryList').innerHTML = '<div class="text-center text-[10px] text-zinc-600 italic">None</div>';
    document.getElementById('gearItemList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    document.getElementById('itemList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    document.getElementById('consumableList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    document.getElementById('weaponList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    document.getElementById('armorList').innerHTML = '<div class="text-center text-xs text-zinc-600 italic">None</div>';
    document.getElementById('thresh_major_extra').value = '0';
    document.getElementById('thresh_severe_extra').value = '0';
    updateThresholds();
    updateAttackBonus();
    autoCache();
}

export function clearSheet() {
    showConfirm('Clear all data? This cannot be undone.', () => {
        resetSheet();
        showToast('Sheet cleared!');
    });
}

export function updateExportIndicator() {}

function showToast(msg) {
    const mode = document.body.getAttribute('data-mode') || 'dark';
    const styles = mode === 'scifi'
        ? 'background:#0d1220;color:#c8dce8;border:1px solid #1e3a5f;box-shadow:0 0 12px rgba(0,180,255,0.2);'
        : mode === 'light'
        ? 'background:#fff;color:#2a2418;border:1px solid #d4c9b8;'
        : 'background:#2a2418;color:#f5efe6;border:1px solid #4a3f30;';
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);${styles}padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;z-index:99999;opacity:0;transition:opacity 0.2s;`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 1000);
}
