import { initAuth, onAuthChange, getUser, getSupabase, escHtml, escHtmlAttr, showAlert, showConfirm } from '../core/auth.js';
import { LS_DM_CREATURES, LS_DM_FEAR, LS_DM_COUNTERS, LS_DM_CAMPAIGN, LS_DM_ACTIONBAR, LS_DM_FEARPOOL, LS_DM_TITLE, LS_DM_ACTIVE_TAB, LS_THEME, TABLE_DM_TABLES } from '../core/constants.js';
import { initMode, setMode, toggleMode, applyTheme, renderThemePicker } from '../core/theme.js';
import { initTracker, renderGrid, renderFearDots, autoCache, creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled } from './tracker.js';
import { initVault, renderVaultGrid, autoCacheVault, vaultCreatures, setVaultCreatures, vaultGroups, setVaultGroups } from './vault.js';
import { initChronicle, renderChronicle, autoCacheChronicle, chronicleEntries, setChronicleEntries } from './chronicle.js';
import { loadCompendium, getLocStr as _getLocStr } from '../core/compendium.js';
import { initAdversariesTab } from './adversaries.js';
import { initDmAuth } from './dm-auth.js';
import { initParty, renderParty, setCurrentTable } from './party.js';

// ========== CONSTANTS ==========
export const SAVE_KEY = LS_DM_CREATURES;
export const FEAR_KEY = LS_DM_FEAR;
export const COUNTERS_KEY = LS_DM_COUNTERS;
export const CAMPAIGN_KEY = LS_DM_CAMPAIGN;

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


const ACTION_BAR_KEY = LS_DM_ACTIONBAR;
const FEAR_POOL_KEY = LS_DM_FEARPOOL;
const TITLE_KEY = LS_DM_TITLE;

const PANEL_IDS = ['panelTracker','panelAdversaries','panelCompendium','panelChronicle','panelVault','panelParty'];

function updateNavSpacer() {
    const nav = document.querySelector('nav');
    const spacer = document.getElementById('navSpacer');
    if (nav && spacer) spacer.style.height = (nav.offsetHeight + 16) + 'px';
}

function applyActionBarMargins() { updateNavSpacer(); }

export function toggleActionBar() {
    const bar = document.getElementById('actionBarRow');
    const collapsed = !bar.classList.contains('hidden');
    bar.classList.toggle('hidden', collapsed);
    document.getElementById('actionBarGearBtn').textContent = collapsed ? '📐 Expand Actions' : '📐 Collapse Actions';
    localStorage.setItem(ACTION_BAR_KEY, collapsed ? '0' : '1');
    updateNavSpacer();
}

function initActionBar() {
    if (localStorage.getItem(ACTION_BAR_KEY) === '0') {
        document.getElementById('actionBarRow').classList.add('hidden');
        document.getElementById('actionBarGearBtn').textContent = '📐 Expand Actions';
    }
}

export function toggleFearPool() {
    const el = document.getElementById('fearPoolRow');
    const collapsed = !el.classList.contains('hidden');
    el.classList.toggle('hidden', collapsed);
    document.getElementById('fearGearBtn').textContent = collapsed ? '🕳️ Expand Fear Pool' : '🕳️ Collapse Fear Pool';
    localStorage.setItem(FEAR_POOL_KEY, collapsed ? '0' : '1');
    updateNavSpacer();
}

function initFearPool() {
    if (localStorage.getItem(FEAR_POOL_KEY) === '0') {
        document.getElementById('fearPoolRow').classList.add('hidden');
        document.getElementById('fearGearBtn').textContent = '🕳️ Expand Fear Pool';
    }
}

export function toggleTitle() {
    const el = document.getElementById('campaignTitleRow');
    const collapsed = !el.classList.contains('hidden');
    el.classList.toggle('hidden', collapsed);
    document.getElementById('titleGearBtn').textContent = collapsed ? '📝 Expand Title' : '📝 Collapse Title';
    localStorage.setItem(TITLE_KEY, collapsed ? '0' : '1');
    updateNavSpacer();
}

function initTitle() {
    if (localStorage.getItem(TITLE_KEY) === '0') {
        document.getElementById('campaignTitleRow').classList.add('hidden');
        document.getElementById('titleGearBtn').textContent = '📝 Expand Title';
    }
}

// ========== TAB SWITCHING ==========
export function switchTab(tab) {
    ['tracker','vault','chronicle','adversaries','compendium','party'].forEach(t => {
        document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('hidden', tab !== t);
        document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', tab === t);
    });
    document.getElementById('trackerActions').classList.toggle('hidden', tab !== 'tracker');
    document.getElementById('vaultActions').classList.toggle('hidden', tab !== 'vault');
    document.getElementById('chronicleActions').classList.toggle('hidden', tab !== 'chronicle');
    const fearRow = document.getElementById('fearPoolRow');
    if (tab === 'tracker') {
        if (localStorage.getItem(FEAR_POOL_KEY) !== '0') fearRow.classList.remove('hidden');
    } else {
        fearRow.classList.add('hidden');
    }
    updateNavSpacer();
    if (tab === 'party') renderParty();  // async, renders on resolve
    const cloak = document.getElementById('tab-cloak');
    if (cloak) cloak.remove();
    localStorage.setItem(LS_DM_ACTIVE_TAB, tab);
}

// ========== SAVE / LOAD (LOCAL) ==========
export function saveSession() {
    const campaign = document.getElementById('campaignName').value.trim();
    const slug = campaign ? campaign.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' : '';
    const data = { creatures: creatures(), actionCounters: actionCounters(), fearFilled: fearFilled(), campaign, vaultCreatures: vaultCreatures(), vaultGroups: vaultGroups(), chronicleEntries: chronicleEntries() };
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
            setVaultGroups(data.vaultGroups || []);
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

// ========== NEW CAMPAIGN ==========
export async function newCampaign(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    showConfirm('Start a new campaign? This will clear all tracker, vault, chronicle, counters and fear data.', async () => {
        setCurrentTable(null);
        setCreatures([]); setActionCounters([]); setFearFilled(0);
        setVaultCreatures([]); setVaultGroups([]);
        setChronicleEntries([]);
        document.getElementById('campaignName').value = '';
        document.getElementById('campaignName').style.width = '18ch';
        localStorage.removeItem(CAMPAIGN_KEY);
        autoCache(); autoCacheVault(); autoCacheChronicle();
        renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
        if (getUser()) {
            const sb = getSupabase();
            const { data: row, error } = await sb.from(TABLE_DM_TABLES)
                .insert({ user_id: getUser().id, campaign_name: 'My Campaign', is_autosave: false })
                .select().single();
            if (!error && row) setCurrentTable(row);
        }
        switchTab('tracker');
    });
}

// ========== EXPOSE TO INLINE HANDLERS ==========
window.switchTab = switchTab;
window.toggleMode = toggleMode;
window.setMode = setMode;
window.applyTheme = applyTheme;
window.saveSession = saveSession;
window.loadSession = loadSession;
window.toggleActionBar = toggleActionBar;
window.toggleFearPool = toggleFearPool;
window.toggleTitle = toggleTitle;
window.newCampaign = newCampaign;

// ========== INIT ==========
window.addEventListener('DOMContentLoaded', async () => {
    // Migrate old DM-specific mode key to shared key
    const oldMode = localStorage.getItem('dh_dm_mode');
    if (oldMode && !localStorage.getItem('dh_mode')) {
        localStorage.setItem('dh_mode', oldMode);
    }
    localStorage.removeItem('dh_dm_mode');

    initMode();
    renderThemePicker();
    applyTheme(localStorage.getItem(LS_THEME) || 'gold');

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
    initTitle();
    initTracker();
    initVault();
    initChronicle();
    initParty();
    renderFearDots();
    renderGrid();
    renderVaultGrid();
    renderChronicle();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden):not(#campaignPickerModal)').forEach(m => m.classList.add('hidden'));
        }
    });

    loadCompendium();
    initAdversariesTab();
    initDmAuth();
    await initAuth();
    if (typeof window._ensureCampaignPicker === 'function') window._ensureCampaignPicker();

    const savedDmTab = localStorage.getItem(LS_DM_ACTIVE_TAB);
    if (savedDmTab && savedDmTab !== 'tracker') switchTab(savedDmTab);
    updateNavSpacer();
    window.addEventListener('resize', updateNavSpacer);
});
