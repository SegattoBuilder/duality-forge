import { SAVE_KEY, THEME_KEY, setRestoring } from './state.js';
import { renderThemePicker, applyTheme, toggleMode, initMode } from './theme.js';
import { toggleSection } from './ui.js';
import { renderDots, updateThresholds, updateAttackBonus } from './trackers.js';
import { openDatabase, closeDatabase, fetchData, filterCards, closeCardDetail } from './cards.js';
import { addInventoryItem } from './inventory.js';
import { addExperience } from './experience.js';
import { addGearItem } from './gear.js';
import { autoCache, saveSheet, loadSheet, clearSheet, updateExportIndicator } from './save.js';
import { submitBugReport } from '../core/feedback.js';
import { initCharAuth } from './char-auth.js';

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
window.saveSheet = saveSheet;
window.loadSheet = loadSheet;
window.clearSheet = clearSheet;
window.autoCache = autoCache;
window.toggleMode = toggleMode;
window.toggleSection = toggleSection;
window.submitBugReport = () => submitBugReport(
    document.getElementById('bugReportText'),
    'reportType',
    document.getElementById('feedbackForm'),
    document.getElementById('feedbackToast')
);

// Modern tab switching
const MODERN_TABS = ['tab-combat', 'tab-cards', 'tab-inventory', 'tab-story', 'tab-support'];

window.switchModernTab = function(tabId) {
    MODERN_TABS.forEach(id => {
        document.getElementById(id).style.display = id === tabId ? '' : 'none';
        document.getElementById('btn-' + id).classList.toggle('active', id === tabId);
    });
};

window.addEventListener('DOMContentLoaded', () => {
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

    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) loadSheet(true);
    updateThresholds();
    updateAttackBonus();
    updateExportIndicator();
    setRestoring(false);

    document.addEventListener('input', () => { updateThresholds(); updateAttackBonus(); autoCache(); });
    document.addEventListener('change', () => { updateThresholds(); updateAttackBonus(); autoCache(); });

    initCharAuth();
});
