import { getUser, getProfile, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut as coreSignOut, saveProfile as coreSaveProfile, cloudSaveRow, cloudLoadRows, cloudDeleteRow, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { TOAST_DURATION, SYNC_STATUS_DURATION, AUTOSAVE_INTERVAL, TABLE_SESSIONS, LS_DM_CREATURES, LS_DM_VAULT, LS_DM_CHRONICLE, LS_DM_COUNTERS, LS_DM_CAMPAIGN } from '../core/constants.js';
import { creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled, autoCache, renderGrid, renderFearDots } from './tracker.js';
import { vaultCreatures, setVaultCreatures, vaultGroups, setVaultGroups, autoCacheVault, renderVaultGrid } from './vault.js';
import { chronicleEntries, setChronicleEntries, autoCacheChronicle, renderChronicle } from './chronicle.js';
import { switchTab } from './app.js';

let cloudAutoSaveInterval = null;
let lastSavedSnapshot = null;
let syncStatusTimer = null;

let campaignPickerShown = false;

function gatherDmData() {
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    return { creatures: creatures(), actionCounters: actionCounters(), fearFilled: fearFilled(), campaign, vaultCreatures: vaultCreatures(), vaultGroups: vaultGroups(), chronicleEntries: chronicleEntries() };
}

export function initDmAuth() {
    onAuthChange(renderAuthUI);
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    onAuthChange(user => {
        if (user && !campaignPickerShown) {
            campaignPickerShown = true;
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

function showSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    el.textContent = text; el.classList.remove('hidden');
    if (syncStatusTimer) clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => el.classList.add('hidden'), SYNC_STATUS_DURATION);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    toast.querySelector('.font-bold').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    // Take initial snapshot
    lastSavedSnapshot = JSON.stringify(gatherDmData());
    cloudAutoSaveInterval = setInterval(async () => {
        if (!getUser()) return;
        const current = JSON.stringify(gatherDmData());
        if (current === lastSavedSnapshot) return;
        lastSavedSnapshot = current;
        await cloudAutoSaveNow();
    }, AUTOSAVE_INTERVAL);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    lastSavedSnapshot = null;
}

async function cloudAutoSaveNow() {
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    const data = gatherDmData();
    const { error } = await cloudSaveRow(TABLE_SESSIONS, { campaign_name: campaign }, data, { isAutosave: true });
    if (!error) showSyncStatus('☁️ Auto-saved');
}

function hasLocalDmData() {
    try {
        const c = JSON.parse(localStorage.getItem(LS_DM_CREATURES) || '[]');
        if (c.length) return true;
    } catch {}
    if (localStorage.getItem(LS_DM_CAMPAIGN)) return true;
    try {
        const v = JSON.parse(localStorage.getItem(LS_DM_VAULT) || '[]');
        if (v.length) return true;
    } catch {}
    try {
        const ch = JSON.parse(localStorage.getItem(LS_DM_CHRONICLE) || '[]');
        if (ch.length) return true;
    } catch {}
    try {
        const ac = JSON.parse(localStorage.getItem(LS_DM_COUNTERS) || '[]');
        if (ac.length) return true;
    } catch {}
    return false;
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    const data = gatherDmData();
    const { error } = await cloudSaveRow(TABLE_SESSIONS, { campaign_name: campaign }, data);
    if (error) showAlert('Cloud save failed: ' + error);
    else { lastSavedSnapshot = JSON.stringify(data); showSyncStatus('☁️ Saved'); }
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    showCloudPicker({
        table: TABLE_SESSIONS, nameColumn: 'campaign_name',
        modalId: 'campaignPickerModal', listId: 'campaignPickerList',
        onPick: applyCampaignRow, emptyText: 'No saved campaigns found.'
    });
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const hasData = creatures().length || vaultCreatures().length || chronicleEntries().length || actionCounters().length;
    if (!hasData) { showAlert('No local data found to import.'); return; }
    showConfirm('Upload your current local data to the cloud as a new save?', async () => { await cloudSave(); });
}

async function doSignOut() {
    const finishSignOut = async () => {
        await coreSignOut();
        setCreatures([]); setActionCounters([]); setFearFilled(0); setVaultCreatures([]); setVaultGroups([]); setChronicleEntries([]);
        document.getElementById('campaignName').value = '';
        localStorage.removeItem(LS_DM_CAMPAIGN);
        autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
        switchTab('tracker');
    };
    await finishSignOut();
}

// ========== AUTH UI ==========
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); document.getElementById('authEmail').value = ''; document.getElementById('authPassword').value = ''; }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

let gearMenuHandler = null;
let authMenuHandler = null;

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

function toggleAuthMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('authMenu');
    const wasHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (authMenuHandler) { document.removeEventListener('click', authMenuHandler); authMenuHandler = null; }
    if (wasHidden) {
        authMenuHandler = (ev) => { if (!menu.contains(ev.target) && !document.getElementById('authBtn').contains(ev.target)) { menu.classList.add('hidden'); document.removeEventListener('click', authMenuHandler); authMenuHandler = null; } };
        setTimeout(() => document.addEventListener('click', authMenuHandler), 0);
    }
}

function closeAuthMenu() { document.getElementById('authMenu').classList.add('hidden'); }

function renderAuthUI() {
    const user = getUser(), profile = getProfile();
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    if (user) {
        const avatarUrl = profile?.avatar_url || user.user_metadata?.picture || '';
        const name = profile?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        btn.innerHTML = avatarUrl ? `<img src="${escHtmlAttr(avatarUrl)}" alt="" class="w-10 h-10 rounded-full border-2 border-[#d4a017] object-cover">` : `<span class="w-10 h-10 rounded-full border-2 border-[#d4a017] bg-[#2a2418] flex items-center justify-center text-sm font-bold text-[#d4a017]">${escHtml(name.charAt(0).toUpperCase())}</span>`;
        btn.onclick = toggleAuthMenu;
        btn.className = 'h-10 w-10 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-pointer';
    } else {
        btn.innerHTML = '<span class="text-[10px] text-zinc-400">Sign In</span>';
        btn.onclick = openAuthModal;
        btn.className = 'h-10 px-2 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#4a3f30] hover:border-[#d4a017] transition-colors';
    }
}

// ========== PROFILE MODAL ==========
function openProfileModal() {
    const profile = getProfile();
    document.getElementById('profileModal').classList.remove('hidden');
    document.getElementById('profileNickname').value = profile?.nickname || '';
    document.getElementById('profileAvatar').value = profile?.avatar_url || '';
    document.getElementById('profileCountry').value = profile?.country || '';
    document.getElementById('profileState').value = profile?.state || '';
    document.getElementById('profileExperience').value = profile?.dm_experience || '';
    document.getElementById('profileAge').value = profile?.age || '';
    document.getElementById('profilePlayerExp').value = profile?.player_experience || '';
    previewAvatar(profile?.avatar_url || '');
}
function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }
function previewAvatar(url) {
    const preview = document.getElementById('profileAvatarPreview');
    if (url && url.match(/^https?:\/\//)) preview.innerHTML = `<img src="${escHtmlAttr(url)}" alt="" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='🎲'">`;
    else preview.innerHTML = '🎲';
}
async function doSaveProfile() {
    const ok = await coreSaveProfile({
        nickname: document.getElementById('profileNickname').value.trim() || null,
        avatar_url: document.getElementById('profileAvatar').value.trim() || null,
        country: document.getElementById('profileCountry').value.trim() || null,
        state: document.getElementById('profileState').value.trim() || null,
        dm_experience: document.getElementById('profileExperience').value || null,
        age: document.getElementById('profileAge').value || null,
        player_experience: document.getElementById('profilePlayerExp').value || null
    });
    if (ok) { closeProfileModal(); showToast('👤 Profile saved!'); }
}

// ========== CAMPAIGN PICKER ==========
function applyCampaignRow(row) {
    const d = row.data;
    setCreatures(d.creatures || []); setActionCounters(d.actionCounters || []); setFearFilled(d.fearFilled || 0);
    setVaultCreatures(d.vaultCreatures || []); setVaultGroups(d.vaultGroups || []); setChronicleEntries(d.chronicleEntries || []);
    if (d.campaign) { document.getElementById('campaignName').value = d.campaign; localStorage.setItem(LS_DM_CAMPAIGN, d.campaign); }
    autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    showSyncStatus('☁️ Loaded');
}

async function showCampaignPicker() {
    showCloudPicker({
        table: TABLE_SESSIONS, nameColumn: 'campaign_name',
        modalId: 'campaignPickerModal', listId: 'campaignPickerList',
        onPick: applyCampaignRow, emptyText: 'No saved campaigns found.'
    });
}

function closeCampaignPicker() { document.getElementById('campaignPickerModal').classList.add('hidden'); }

function startNewCampaign() {
    closeCampaignPicker();
    setCreatures([]); setActionCounters([]); setFearFilled(0);
    setVaultCreatures([]); setVaultGroups([]); setChronicleEntries([]);
    document.getElementById('campaignName').value = '';
    document.getElementById('campaignName').style.width = '18ch';
    localStorage.removeItem(LS_DM_CAMPAIGN);
    autoCache(); autoCacheVault(); autoCacheChronicle();
    renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    switchTab('tracker');
}

// ========== WINDOW BINDINGS ==========
window.openAuthModal = openAuthModal;
window.toggleGear = toggleGear;
window.closeGear = closeGear;
window.closeAuthMenu = closeAuthMenu;
window.closeAuthModal = closeAuthModal;
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = () => signInWithEmail(document.getElementById('authEmail').value.trim(), document.getElementById('authPassword').value);
window.signUpWithEmail = () => signUpWithEmail(document.getElementById('authEmail').value.trim(), document.getElementById('authPassword').value);
window.signOut = doSignOut;
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window.closeCampaignPicker = closeCampaignPicker;
window.startNewCampaign = startNewCampaign;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;
