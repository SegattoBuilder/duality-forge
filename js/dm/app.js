import { initAuth, onAuthChange, escHtml, escHtmlAttr, showAlert } from '../core/auth.js';
import { initTracker, renderGrid, renderFearDots, autoCache, creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled } from './tracker.js';
import { initVault, renderVaultGrid, autoCacheVault, vaultCreatures, setVaultCreatures } from './vault.js';
import { initChronicle, renderChronicle, autoCacheChronicle, chronicleEntries, setChronicleEntries } from './chronicle.js';
import { loadCompendium, getLocStr as _getLocStr } from '../core/compendium.js';
import { initAdversariesTab } from './adversaries.js';
import { initDmAuth } from './dm-auth.js';

// ========== CONSTANTS ==========
export const SAVE_KEY = 'dh_dm_creatures';
export const FEAR_KEY = 'dh_dm_fear';
export const COUNTERS_KEY = 'dh_dm_counters';
export const CAMPAIGN_KEY = 'dh_campaign_name';
const MODE_KEY = 'dh_dm_mode';

// ========== RE-EXPORT UTILITIES ==========
export { escHtml, escHtmlAttr };

// ========== HELPERS ==========
export function getLocStr(obj) { return _getLocStr(obj); }

export function getNextName(baseName) {
    const all = [...creatures(), ...vaultCreatures()];
    const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = all.filter(c => c.name === baseName || c.name.match(new RegExp('^' + escaped + ' \\d+$')));
    if (existing.length === 0) return baseName;
    const nums = existing.map(c => { const m = c.name.match(/ (\d+)$/); return m ? parseInt(m[1]) : 1; });
    return `${baseName} ${Math.max(...nums) + 1}`;
}

export function hasNameConflict(name, excludeId) {
    const all = [...creatures(), ...vaultCreatures()];
    return all.some(c => c.id !== excludeId && c.name === name);
}

export function isVaultActive() {
    return !document.getElementById('panelVault').classList.contains('hidden');
}

// ========== MODE TOGGLE ==========
export function setMode(mode) {
    document.body.setAttribute('data-mode', mode);
    localStorage.setItem(MODE_KEY, mode);
}

export function toggleMode() {
    const isLight = document.body.getAttribute('data-mode') === 'light';
    setMode(isLight ? 'dark' : 'light');
}

function initMode() {
    const saved = localStorage.getItem(MODE_KEY) || 'dark';
    document.body.setAttribute('data-mode', saved);
}

// ========== ACTION BAR TOGGLE ==========
const ACTION_BAR_KEY = 'dh_dm_actionbar';
const FEAR_POOL_KEY = 'dh_dm_fearpool';

const PANEL_IDS = ['panelTracker','panelAdversaries','panelCompendium','panelChronicle','panelVault'];

function applyActionBarMargins(collapsed) {
    PANEL_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (collapsed) {
            el.classList.remove('mt-52','sm:mt-36');
            el.classList.add('mt-40','sm:mt-24');
        } else {
            el.classList.remove('mt-40','sm:mt-24');
            el.classList.add('mt-52','sm:mt-36');
        }
    });
}

export function toggleActionBar() {
    const bar = document.getElementById('actionBarRow');
    const collapsed = !bar.classList.contains('hidden');
    bar.classList.toggle('hidden', collapsed);
    document.getElementById('actionBarGearBtn').textContent = collapsed ? '📐 Expand Actions' : '📐 Collapse Actions';
    localStorage.setItem(ACTION_BAR_KEY, collapsed ? '0' : '1');
    applyActionBarMargins(collapsed);
}

function initActionBar() {
    if (localStorage.getItem(ACTION_BAR_KEY) === '0') {
        document.getElementById('actionBarRow').classList.add('hidden');
        document.getElementById('actionBarGearBtn').textContent = '📐 Expand Actions';
        applyActionBarMargins(true);
    }
}

export function toggleFearPool() {
    const el = document.getElementById('fearPoolRow');
    const collapsed = !el.classList.contains('hidden');
    el.classList.toggle('hidden', collapsed);
    document.getElementById('fearGearBtn').textContent = collapsed ? '🕳️ Expand Fear Pool' : '🕳️ Collapse Fear Pool';
    localStorage.setItem(FEAR_POOL_KEY, collapsed ? '0' : '1');
}

function initFearPool() {
    if (localStorage.getItem(FEAR_POOL_KEY) === '0') {
        document.getElementById('fearPoolRow').classList.add('hidden');
        document.getElementById('fearGearBtn').textContent = '🕳️ Expand Fear Pool';
    }
}

// ========== TAB SWITCHING ==========
export function switchTab(tab) {
    ['tracker','vault','chronicle','adversaries','compendium'].forEach(t => {
        document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('hidden', tab !== t);
        document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', tab === t);
    });
    document.getElementById('trackerActions').classList.toggle('hidden', tab !== 'tracker');
    document.getElementById('vaultActions').classList.toggle('hidden', tab !== 'vault');
    document.getElementById('chronicleActions').classList.toggle('hidden', tab !== 'chronicle');
}

// ========== SAVE / LOAD (LOCAL) ==========
export function saveSession() {
    const campaign = document.getElementById('campaignName').value.trim();
    const slug = campaign ? campaign.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' : '';
    const data = { creatures: creatures(), actionCounters: actionCounters(), fearFilled: fearFilled(), campaign, vaultCreatures: vaultCreatures(), chronicleEntries: chronicleEntries() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + 'dh-session-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

export function loadSession(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            setCreatures(data.creatures || []);
            setActionCounters(data.actionCounters || []);
            setFearFilled(data.fearFilled || 0);
            setVaultCreatures(data.vaultCreatures || []);
            setChronicleEntries(data.chronicleEntries || []);
            if (data.campaign) {
                document.getElementById('campaignName').value = data.campaign;
                localStorage.setItem(CAMPAIGN_KEY, data.campaign);
            }
            autoCache();
            autoCacheVault();
            autoCacheChronicle();
            renderFearDots();
            renderGrid();
            renderVaultGrid();
            renderChronicle();
        } catch {
            showAlert('Invalid session file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ========== EXPOSE TO INLINE HANDLERS ==========
window.switchTab = switchTab;
window.toggleMode = toggleMode;
window.setMode = setMode;
window.saveSession = saveSession;
window.loadSession = loadSession;
window.toggleActionBar = toggleActionBar;
window.toggleFearPool = toggleFearPool;

// ========== INIT ==========
window.addEventListener('DOMContentLoaded', () => {
    initMode();

    // Load from localStorage
    try { setCreatures(JSON.parse(localStorage.getItem(SAVE_KEY)) || []); } catch { setCreatures([]); }
    try { setActionCounters(JSON.parse(localStorage.getItem(COUNTERS_KEY)) || []); } catch { setActionCounters([]); }
    setFearFilled(parseInt(localStorage.getItem(FEAR_KEY)) || 0);

    const savedCampaign = localStorage.getItem(CAMPAIGN_KEY) || '';
    const cnInput = document.getElementById('campaignName');
    cnInput.value = savedCampaign;
    if (savedCampaign) cnInput.style.width = Math.min(savedCampaign.length + 2, 56) + 'ch';

    initActionBar();
    initFearPool();
    initTracker();
    initVault();
    initChronicle();
    renderFearDots();
    renderGrid();
    renderVaultGrid();
    renderChronicle();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
        }
    });

    loadCompendium();
    initAdversariesTab();
    initDmAuth();
    initAuth();
});
