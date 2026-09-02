import { SAVE_KEY, THEME_KEY, setRestoring } from './state.js';
import { renderThemePicker, applyTheme, toggleMode, setMode, initMode } from './theme.js';
import { toggleSection } from './ui.js';
import { renderDots, updateThresholds, updateAttackBonus } from './trackers.js';
import { openDatabase, closeDatabase, fetchData, filterCards, closeCardDetail, addCardToSheet } from './cards.js';
import { addInventoryItem } from './inventory.js';
import { addExperience } from './experience.js';
import { addGearItem, addWeapon, addArmor, addItem, addConsumable } from './gear.js';
import { autoCache, saveSheet, loadSheet, clearSheet, resetSheet, updateExportIndicator } from './save.js';
import { initCharAuth } from './char-auth.js';
import { initAuth } from '../core/auth.js';
import { loadCompendium } from '../core/compendium.js';
import { showConfirm } from '../core/auth.js';

// Expose to global for inline handlers
window.updateThresholds = updateThresholds;
window.updateAttackBonus = updateAttackBonus;
window.openDatabase = openDatabase;
window.closeDatabase = closeDatabase;
window.closeCardDetail = closeCardDetail;
window.fetchData = fetchData;
window.filterCards = filterCards;
window.addInventoryItem = addInventoryItem;
window.addExperience = addExperience;
window.addGearItem = addGearItem;
window.addWeapon = addWeapon;
window.addArmor = addArmor;
window.addItem = addItem;
window.addConsumable = addConsumable;
function newCharacter(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    showConfirm('Start a new character? This will clear all sheet data.', () => {
        resetSheet();
        switchModernTab('tab-combat');
    });
}

window.saveSheet = saveSheet;
window.loadSheet = loadSheet;
window.clearSheet = clearSheet;
window.newCharacter = newCharacter;
window.autoCache = autoCache;
window.toggleMode = toggleMode;
window.setMode = setMode;
window.toggleSection = toggleSection;

// Modern tab switching
const MODERN_TABS = ['tab-combat', 'tab-cards', 'tab-inventory', 'tab-story', 'tab-compendium'];

window.switchModernTab = function(tabId) {
    MODERN_TABS.forEach(id => {
        document.getElementById(id).style.display = id === tabId ? '' : 'none';
        document.getElementById('btn-' + id).classList.toggle('active', id === tabId);
    });
    const cloak = document.getElementById('tab-cloak');
    if (cloak) cloak.remove();
    localStorage.setItem('dh_active_tab', tabId);
};

window.addEventListener('DOMContentLoaded', async () => {
    setRestoring(true);
    initMode();
    renderThemePicker();
    applyTheme(localStorage.getItem(THEME_KEY) || 'gold');

    ['hp', 'stress', 'hope', 'armor'].forEach(t => {
        const input = document.getElementById(`${t}_max`);
        if (input) {
            renderDots(t, input.value);
            input.onchange = (e) => renderDots(t, e.target.value);
        }
    });

    // Migrate old key
    if (!localStorage.getItem(SAVE_KEY) && localStorage.getItem('dh_sheet_v1')) {
        localStorage.setItem(SAVE_KEY, localStorage.getItem('dh_sheet_v1'));
        localStorage.removeItem('dh_sheet_v1');
    }

    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) loadSheet(true);
    updateThresholds();
    updateAttackBonus();
    updateExportIndicator();
    setRestoring(false);

    document.addEventListener('input', () => { updateThresholds(); updateAttackBonus(); autoCache(); });
    document.addEventListener('change', () => { updateThresholds(); updateAttackBonus(); autoCache(); });

    const savedTab = localStorage.getItem('dh_active_tab');
    if (savedTab && MODERN_TABS.includes(savedTab)) switchModernTab(savedTab);

    initCharAuth();
    await initAuth();
    if (typeof window._ensureCharacterPicker === 'function') window._ensureCharacterPicker();
    loadCompendium({ characterMode: true, onAddWeapon: addWeapon, onAddArmor: addArmor, onAddItem: addItem, onAddConsumable: addConsumable, onAddGear: addGearItem, onAddInventory: addInventoryItem, onAddDomainCard: addCardToSheet, onAddGeneral: addCardToSheet });
});
