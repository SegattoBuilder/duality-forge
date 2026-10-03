import { getUser, getSupabase, onAuthChange, showConfirm, showAlert } from '../core/auth.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { TOAST_DURATION, AUTOSAVE_INTERVAL, TABLE_DM_TABLES, TABLE_CHARACTERS, LS_DM_CREATURES, LS_DM_VAULT, LS_DM_CHRONICLE, LS_DM_COUNTERS, LS_DM_CAMPAIGN } from '../core/constants.js';
import { creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled, autoCache, renderGrid, renderFearDots } from './tracker.js';
import { vaultCreatures, setVaultCreatures, vaultGroups, setVaultGroups, autoCacheVault, renderVaultGrid } from './vault.js';
import { chronicleEntries, setChronicleEntries, autoCacheChronicle, renderChronicle } from './chronicle.js';
import { switchTab } from './app.js';
import { setCurrentTable, getCurrentTable, restoreCurrentTable } from './party.js';
import { showLoaded, pickFailed } from '../core/nav.js';

let cloudAutoSaveInterval = null;
let lastSavedSnapshot = null;
let campaignPickerShown = false;
let savePromise = null;
let lastPartyMembers = null;

function gatherDmData() {
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    return { creatures: creatures(), actionCounters: actionCounters(), fearFilled: fearFilled(), campaign, vaultCreatures: vaultCreatures(), vaultGroups: vaultGroups(), chronicleEntries: chronicleEntries() };
}

function withParty(data) {
    return lastPartyMembers ? { ...data, partyMembers: lastPartyMembers } : data;
}

// Serialize saves: a second save waits for the first (prevents duplicate inserts on double-click)
function runSave(fn) {
    const next = (savePromise || Promise.resolve()).then(fn, fn);
    savePromise = next.finally(() => { if (savePromise === next) savePromise = null; });
    return next;
}

export function initDmAuth() {
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    onAuthChange(async user => {
        if (user) await restoreCurrentTable();
        if (user && !campaignPickerShown) {
            campaignPickerShown = true;
            if (await tryDashboardPick()) return;
            if (!hasLocalDmData()) showCampaignPicker();
        }
    });
    window._ensureCampaignPicker = () => {
        if (getUser() && !campaignPickerShown) {
            campaignPickerShown = true;
            if (!hasLocalDmData()) showCampaignPicker();
        }
    };
}

async function tryDashboardPick() {
    const raw = sessionStorage.getItem('dh_dashboard_pick');
    if (!raw) return false;
    sessionStorage.removeItem('dh_dashboard_pick');
    try {
        const pick = JSON.parse(raw);
        if (pick.type !== 'dm' || !pick.id) return false;
        const sb = getSupabase();
        const { data: row } = await sb.from(TABLE_DM_TABLES).select('*').eq('id', pick.id).single();
        if (!row) { pickFailed("Couldn't open that campaign — it may have been deleted, or it isn't yours."); return true; }
        applyCampaignRow(row);
        return true;
    } catch { return false; }
    finally { showLoaded(); }
}

let syncAnimationTimer = null;

function showSyncStatus(text) {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    btn.classList.remove('saved');
    void btn.offsetWidth;
    btn.classList.add('saved');
    btn.title = text;
    if (syncAnimationTimer) clearTimeout(syncAnimationTimer);
    syncAnimationTimer = setTimeout(() => {
        btn.classList.remove('saved');
        btn.title = 'Save to Cloud';
    }, 2500);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    toast.querySelector('.font-bold').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}

function isDirty() {
    if (!lastSavedSnapshot) return false;
    return JSON.stringify(gatherDmData()) !== lastSavedSnapshot;
}

function onBeforeUnload(e) {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
}

function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && getUser() && isDirty()) runSave(cloudAutoSaveNow);
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    lastSavedSnapshot = JSON.stringify(gatherDmData());
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    cloudAutoSaveInterval = setInterval(() => {
        if (getUser() && isDirty()) runSave(cloudAutoSaveNow);
    }, AUTOSAVE_INTERVAL);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    lastSavedSnapshot = null;
}

async function cloudAutoSaveNow() {
    const table = getCurrentTable();
    if (!table) return;
    const sb = getSupabase();
    const base = gatherDmData();
    const snapshot = JSON.stringify(base);
    const data = withParty(base);
    const campaign = data.campaign?.trim();
    const counts = { creature_count: data.creatures?.length || 0, vault_count: data.vaultCreatures?.length || 0, chronicle_count: data.chronicleEntries?.length || 0 };
    const { data: rows, error } = await sb.from(TABLE_DM_TABLES)
        .update({ data, campaign_name: campaign || table.campaign_name, ...counts, updated_at: new Date().toISOString() })
        .eq('id', table.id)
        .select('id');
    if (error || !rows?.length) return;
    lastSavedSnapshot = snapshot;
    if (campaign) setCurrentTable({ ...table, campaign_name: campaign });
    showSyncStatus('☁️ Auto-saved');
}

function hasLocalDmData() {
    try { if (JSON.parse(localStorage.getItem(LS_DM_CREATURES) || '[]').length) return true; } catch {}
    if (localStorage.getItem(LS_DM_CAMPAIGN)) return true;
    try { if (JSON.parse(localStorage.getItem(LS_DM_VAULT) || '[]').length) return true; } catch {}
    try { if (JSON.parse(localStorage.getItem(LS_DM_CHRONICLE) || '[]').length) return true; } catch {}
    try { if (JSON.parse(localStorage.getItem(LS_DM_COUNTERS) || '[]').length) return true; } catch {}
    return false;
}

// ========== CLOUD SAVE / LOAD ==========

function cloudSave() {
    if (!getUser()) { window.location.href = '/'; return; }
    return runSave(cloudSaveNow);
}

async function cloudSaveNow() {
    const sb = getSupabase();
    const base = gatherDmData();
    const snapshot = JSON.stringify(base);
    const campaign = base.campaign?.trim();
    if (!campaign) { showAlert('Campaign name is required to save.'); return; }
    let table = getCurrentTable();

    // Snapshot party members (promoted columns — no need to download their sheets)
    if (table) {
        const { data: members } = await sb.from(TABLE_CHARACTERS)
            .select('character_name, class, level')
            .eq('table_id', table.id);
        if (members) {
            lastPartyMembers = members.map(m => ({ name: m.character_name || 'Unnamed', class: m.class || '', level: m.level ?? '' }));
        }
    }
    const data = withParty(base);
    const counts = { creature_count: data.creatures?.length || 0, vault_count: data.vaultCreatures?.length || 0, chronicle_count: data.chronicleEntries?.length || 0 };

    if (table) {
        const { data: rows, error } = await sb.from(TABLE_DM_TABLES)
            .update({ data, campaign_name: campaign, ...counts, updated_at: new Date().toISOString() })
            .eq('id', table.id)
            .select('id');
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
        if (!rows?.length) { showAlert('Cloud save failed: this campaign no longer exists in the cloud. Use "New" to save it as a new campaign.'); return; }
        table = { ...table, campaign_name: campaign };
    } else {
        const { data: row, error } = await sb.from(TABLE_DM_TABLES)
            .insert({ user_id: getUser().id, campaign_name: campaign, data, ...counts })
            .select('id, campaign_name').single();
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
        table = row;
    }

    setCurrentTable(table);
    lastSavedSnapshot = snapshot;
    showSyncStatus('☁️ Saved');
}

async function cloudLoad() {
    if (!getUser()) { window.location.href = '/'; return; }
    showCampaignPicker();
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const hasData = creatures().length || vaultCreatures().length || chronicleEntries().length || actionCounters().length;
    if (!hasData) { showAlert('No local data found to import.'); return; }
    showConfirm('Upload your current local data to the cloud as a new save?', async () => { await cloudSave(); });
}

// ========== GEAR MENU ==========
let gearMenuHandler = null;

function toggleGear(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('gearMenu');
    const wasHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (gearMenuHandler) { document.removeEventListener('click', gearMenuHandler); gearMenuHandler = null; }
    if (wasHidden) {
        gearMenuHandler = (ev) => { if (!menu.contains(ev.target) && !document.getElementById('gearBtn').contains(ev.target)) { menu.classList.add('hidden'); document.removeEventListener('click', gearMenuHandler); gearMenuHandler = null; } };
        setTimeout(() => document.addEventListener('click', gearMenuHandler), 0);
    }
}

function closeGear() { document.getElementById('gearMenu').classList.add('hidden'); }

// ========== CAMPAIGN PICKER ==========

function applyCampaignRow(row) {
    const d = row.data || {};
    lastPartyMembers = d.partyMembers || null;
    setCreatures(d.creatures || []); setActionCounters(d.actionCounters || []); setFearFilled(d.fearFilled || 0);
    setVaultCreatures(d.vaultCreatures || []); setVaultGroups(d.vaultGroups || []); setChronicleEntries(d.chronicleEntries || []);
    const campaign = d.campaign || row.campaign_name || '';
    if (campaign) { document.getElementById('campaignName').value = campaign; localStorage.setItem(LS_DM_CAMPAIGN, campaign); }
    autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    setCurrentTable(row);
    lastSavedSnapshot = JSON.stringify(gatherDmData());
    showSyncStatus('☁️ Loaded');
}

async function showCampaignPicker() {
    showCloudPicker({
        table: TABLE_DM_TABLES, nameColumn: 'campaign_name',
        modalId: 'campaignPickerModal', listId: 'campaignPickerList',
        onPick: applyCampaignRow, emptyText: 'No saved campaigns found.',
        onBeforeDelete: async (ids) => {
            const sb = getSupabase();
            for (const id of ids) {
                await sb.from(TABLE_CHARACTERS).update({ table_approved: 'kicked' }).eq('table_id', id);
            }
        }
    });
}

function closeCampaignPicker() { document.getElementById('campaignPickerModal').classList.add('hidden'); }

async function startNewCampaign() {
    closeCampaignPicker();
    setCurrentTable(null);
    lastPartyMembers = null;
    setCreatures([]); setActionCounters([]); setFearFilled(0);
    setVaultCreatures([]); setVaultGroups([]); setChronicleEntries([]);
    document.getElementById('campaignName').value = '';
    document.getElementById('campaignName').style.width = '18ch';
    localStorage.removeItem(LS_DM_CAMPAIGN);
    autoCache(); autoCacheVault(); autoCacheChronicle();
    renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    // Create dm_tables row immediately
    if (getUser()) {
        const sb = getSupabase();
        const { data: row, error } = await sb.from(TABLE_DM_TABLES)
            .insert({ user_id: getUser().id, campaign_name: 'My Campaign' })
            .select('id, campaign_name').single();
        if (!error && row) setCurrentTable(row);
    }
    switchTab('tracker');
}

// ========== WINDOW BINDINGS ==========
window.openAuthModal = () => { window.location.href = '/'; };
window.toggleGear = toggleGear;
window.closeGear = closeGear;
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window.closeCampaignPicker = closeCampaignPicker;
window.startNewCampaign = startNewCampaign;
