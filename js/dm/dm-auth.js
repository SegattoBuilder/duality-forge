import { getUser, getProfile, getSupabase, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, changeEmail, isEmailUser, signOut as coreSignOut, signOutAll as coreSignOutAll, deleteAccount as coreDeleteAccount, saveProfile as coreSaveProfile, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { TOAST_DURATION, SYNC_STATUS_DURATION, AUTOSAVE_INTERVAL, TABLE_DM_TABLES, TABLE_CHARACTERS, LS_DM_CREATURES, LS_DM_VAULT, LS_DM_CHRONICLE, LS_DM_COUNTERS, LS_DM_CAMPAIGN } from '../core/constants.js';
import { creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled, autoCache, renderGrid, renderFearDots } from './tracker.js';
import { vaultCreatures, setVaultCreatures, vaultGroups, setVaultGroups, autoCacheVault, renderVaultGrid } from './vault.js';
import { chronicleEntries, setChronicleEntries, autoCacheChronicle, renderChronicle } from './chronicle.js';
import { switchTab } from './app.js';
import { setCurrentTable, getCurrentTable, restoreCurrentTable } from './party.js';

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
    onAuthChange(async user => {
        if (user) await restoreCurrentTable();
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
    const table = getCurrentTable();
    if (!table) return;
    const sb = getSupabase();
    const data = gatherDmData();
    const campaign = data.campaign;

    // Check if autosave row exists for this campaign
    const { data: existing } = await sb.from(TABLE_DM_TABLES)
        .select('id').eq('user_id', getUser().id).eq('campaign_name', campaign).eq('is_autosave', true).limit(1);

    let error;
    if (existing && existing.length) {
        ({ error } = await sb.from(TABLE_DM_TABLES)
            .update({ data, campaign_name: campaign, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id));
    } else {
        ({ error } = await sb.from(TABLE_DM_TABLES)
            .insert({ user_id: getUser().id, campaign_name: campaign, data, is_autosave: true }));
    }
    if (!error) showSyncStatus('☁️ Auto-saved');
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

async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const sb = getSupabase();
    const data = gatherDmData();
    const campaign = data.campaign;
    let table = getCurrentTable();

    if (table) {
        // Update existing campaign
        const { error } = await sb.from(TABLE_DM_TABLES)
            .update({ data, campaign_name: campaign, updated_at: new Date().toISOString() })
            .eq('id', table.id);
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
        table.campaign_name = campaign;
        table.data = data;
    } else {
        // Create new campaign
        const { data: row, error } = await sb.from(TABLE_DM_TABLES)
            .insert({ user_id: getUser().id, campaign_name: campaign, data, is_autosave: false })
            .select().single();
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
        table = row;
    }

    setCurrentTable(table);
    lastSavedSnapshot = JSON.stringify(data);
    showSyncStatus('☁️ Saved');
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    showCampaignPicker();
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const hasData = creatures().length || vaultCreatures().length || chronicleEntries().length || actionCounters().length;
    if (!hasData) { showAlert('No local data found to import.'); return; }
    showConfirm('Upload your current local data to the cloud as a new save?', async () => { await cloudSave(); });
}

async function doSignOut() {
    await coreSignOut();
    window.location.href = '/';
}

async function doSignOutAll() {
    showConfirm('Sign out from all devices?', async () => {
        await coreSignOutAll();
        window.location.href = '/';
    });
}

function doDeleteAccount() {
    showDeleteAccountModal(async () => {
        const ok = await coreDeleteAccount();
        if (ok) window.location.href = '/';
    });
}

function showDeleteAccountModal(onConfirm) {
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('deleteConfirmInput');
    const btn = document.getElementById('deleteConfirmBtn');
    input.value = '';
    btn.disabled = true;
    btn.classList.add('opacity-40', 'cursor-not-allowed');
    input.oninput = () => {
        const ok = input.value.trim().toUpperCase() === 'DELETE';
        btn.disabled = !ok;
        btn.classList.toggle('opacity-40', !ok);
        btn.classList.toggle('cursor-not-allowed', !ok);
    };
    btn.onclick = () => { modal.classList.add('hidden'); onConfirm(); };
    document.getElementById('deleteCancelBtn').onclick = () => modal.classList.add('hidden');
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
        btn.innerHTML = avatarUrl ? `<img src="${escHtmlAttr(avatarUrl)}" alt="" class="w-10 h-10 rounded-full border-2 object-cover" style="border-color:var(--accent-1)">` : `<span class="w-10 h-10 rounded-full border-2 bg-[#2a2418] flex items-center justify-center text-sm font-bold" style="border-color:var(--accent-1);color:var(--accent-1)">${escHtml(name.charAt(0).toUpperCase())}</span>`;
        btn.onclick = toggleAuthMenu;
        btn.className = 'h-10 w-10 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-pointer';
    } else {
        btn.innerHTML = '<span class="text-[10px] text-zinc-400">Sign In</span>';
        btn.onclick = openAuthModal;
        btn.className = 'h-10 px-2 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#4a3f30] transition-colors btn-nav';
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
    const resetBtn = document.getElementById('profileResetPwBtn');
    if (resetBtn) resetBtn.classList.toggle('hidden', !isEmailUser());
    const changeEmailBtn = document.getElementById('profileChangeEmailBtn');
    if (changeEmailBtn) changeEmailBtn.classList.toggle('hidden', !isEmailUser());
    const changeEmailRow = document.getElementById('changeEmailRow');
    if (changeEmailRow) { changeEmailRow.classList.add('hidden'); }
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
    const d = row.data || {};
    setCreatures(d.creatures || []); setActionCounters(d.actionCounters || []); setFearFilled(d.fearFilled || 0);
    setVaultCreatures(d.vaultCreatures || []); setVaultGroups(d.vaultGroups || []); setChronicleEntries(d.chronicleEntries || []);
    const campaign = d.campaign || row.campaign_name || '';
    if (campaign) { document.getElementById('campaignName').value = campaign; localStorage.setItem(LS_DM_CAMPAIGN, campaign); }
    autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    setCurrentTable(row);
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
                await sb.from(TABLE_CHARACTERS).update({ table_id: null, table_approved: null }).eq('table_id', id);
            }
        }
    });
}

function closeCampaignPicker() { document.getElementById('campaignPickerModal').classList.add('hidden'); }

async function startNewCampaign() {
    closeCampaignPicker();
    setCurrentTable(null);
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
            .insert({ user_id: getUser().id, campaign_name: 'My Campaign', is_autosave: false })
            .select().single();
        if (!error && row) setCurrentTable(row);
    }
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
window.resetPassword = () => resetPassword(document.getElementById('authEmail').value.trim());
window.resetPasswordFromProfile = () => { const u = getUser(); if (u?.email) resetPassword(u.email); };
window.changeEmailFromProfile = () => {
    const input = document.getElementById('changeEmailInput');
    if (input) changeEmail(input.value.trim());
};
window.toggleChangeEmail = () => {
    const row = document.getElementById('changeEmailRow');
    if (row) row.classList.toggle('hidden');
};
window.signOut = doSignOut;
window.signOutAll = doSignOutAll;
window.deleteAccount = doDeleteAccount;
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window.closeCampaignPicker = closeCampaignPicker;
window.startNewCampaign = startNewCampaign;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;
