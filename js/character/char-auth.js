import { initAuth, getUser, getProfile, getSupabase, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, changeEmail, isEmailUser, signOut as coreSignOut, signOutAll as coreSignOutAll, deleteAccount as coreDeleteAccount, saveProfile as coreSaveProfile, cloudSaveRow, cloudLoadRows, cloudDeleteRow, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { TOAST_DURATION, SYNC_STATUS_DURATION, AUTOSAVE_INTERVAL, TABLE_CHARACTERS, TABLE_DM_TABLES, LS_CHAR_SAVE } from '../core/constants.js';
import { gatherData, applyData, autoCache, resetSheet } from './save.js';

let cloudAutoSaveInterval = null;
let lastSavedSnapshot = null;
let syncStatusTimer = null;
let characterPickerShown = false;
let linkedTable = null;
let currentCharacterRowId = null;

export function initCharAuth() {
    onAuthChange(renderAuthUI);
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    onAuthChange(user => {
        renderTableLink();
        if (user && !characterPickerShown) {
            characterPickerShown = true;
            const localRaw = localStorage.getItem(LS_CHAR_SAVE);
            let hasLocal = false;
            try { const d = JSON.parse(localRaw); hasLocal = d && (d.fields?.charName || (d.cards && d.cards.length)); } catch {}
            if (!hasLocal) showCharacterPicker();
        }
    });
    window._ensureCharacterPicker = () => {
        if (getUser() && !characterPickerShown) {
            characterPickerShown = true;
            const localRaw = localStorage.getItem(LS_CHAR_SAVE);
            let hasLocal = false;
            try { const d = JSON.parse(localRaw); hasLocal = d && (d.fields?.charName || (d.cards && d.cards.length)); } catch {}
            if (!hasLocal) showCharacterPicker();
        }
    };
}

function showSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = text; el.classList.remove('hidden');
    if (syncStatusTimer) clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => el.classList.add('hidden'), SYNC_STATUS_DURATION);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    if (!toast) return;
    const bold = toast.querySelector('.font-bold');
    if (bold) bold.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    lastSavedSnapshot = JSON.stringify(gatherData());
    cloudAutoSaveInterval = setInterval(async () => {
        if (!getUser()) return;
        const current = JSON.stringify(gatherData());
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
    const data = gatherData();
    const charName = data.fields?.charName?.trim() || 'My Character';
    const { error, id } = await cloudSaveRow(TABLE_CHARACTERS, { character_name: charName }, data, { isAutosave: true });
    if (!error) {
        if (id && !currentCharacterRowId) currentCharacterRowId = id;
        showSyncStatus('☁️ Auto-saved');
    }
    await refreshTableApproval();
}

async function refreshTableApproval() {
    if (!currentCharacterRowId) return;
    const sb = getSupabase();
    const { data } = await sb.from(TABLE_CHARACTERS).select('table_id, table_approved').eq('id', currentCharacterRowId).single();
    if (!data) return;
    if (!data.table_id && data.table_approved === null) {
        linkedTable = { _closed: true };
        renderTableLink();
        return;
    }
    if (!data.table_id) {
        if (linkedTable) { linkedTable = null; renderTableLink(); }
        return;
    }
    if (!linkedTable || linkedTable._closed) return;
    const wasApproved = linkedTable._approved;
    linkedTable._approved = data.table_approved || false;
    if (wasApproved !== linkedTable._approved) renderTableLink();
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const data = gatherData();
    const charName = data.fields?.charName?.trim() || 'My Character';
    const { error, id } = await cloudSaveRow(TABLE_CHARACTERS, { character_name: charName }, data);
    if (error) showAlert('Cloud save failed: ' + error);
    else {
        lastSavedSnapshot = JSON.stringify(data);
        if (id) currentCharacterRowId = id;
        renderTableLink();
        showSyncStatus('☁️ Saved');
    }
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    showCloudPicker({
        table: TABLE_CHARACTERS, nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const raw = localStorage.getItem(LS_CHAR_SAVE);
    if (!raw) { showAlert('No local data found to import.'); return; }
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
        btn.className = 'h-10 px-3 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#4a3f30] transition-colors btn-nav';
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
window.closeCharacterPicker = closeCharacterPicker;
window.startNewCharacter = startNewCharacter;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;
window.openTableLinkModal = openTableLinkModal;
window.closeTableLinkModal = () => document.getElementById('tableLinkModal').classList.add('hidden');
window.submitTableLink = submitTableLink;
window.unlinkTable = unlinkFromTable;
window.dismissClosedTable = () => {
    if (!currentCharacterRowId) return;
    const sb = getSupabase();
    sb.from(TABLE_CHARACTERS).update({ table_approved: false }).eq('id', currentCharacterRowId).then(() => {
        linkedTable = null;
        renderTableLink();
    });
};

// ========== CHARACTER PICKER ==========
function applyCharacterRow(row) {
    applyData(row.data);
    localStorage.setItem(LS_CHAR_SAVE, JSON.stringify(row.data));
    currentCharacterRowId = row.id;
    linkedTable = null;
    if (row.table_id) loadLinkedTable(row.table_id, row.table_approved);
    else if (!row.table_id && row.table_approved === null) { linkedTable = { _closed: true }; renderTableLink(); }
    else renderTableLink();
    showSyncStatus('☁️ Loaded');
}

async function showCharacterPicker() {
    showCloudPicker({
        table: TABLE_CHARACTERS, nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

function closeCharacterPicker() { document.getElementById('characterPickerModal').classList.add('hidden'); }

function startNewCharacter() {
    closeCharacterPicker();
    resetSheet();
    currentCharacterRowId = null;
    linkedTable = null;
    renderTableLink();
}

// ========== TABLE LINK / UNLINK ==========

async function loadLinkedTable(tableId, approved) {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from(TABLE_DM_TABLES).select('id, campaign_name').eq('id', tableId).single();
    if (data) {
        linkedTable = data;
        linkedTable._approved = approved || false;
    } else {
        linkedTable = null;
    }
    renderTableLink();
}

function renderTableLink() {
    const container = document.getElementById('tableLinkStatus');
    if (!container) return;
    if (!getUser()) {
        container.innerHTML = '';
        return;
    }
    if (linkedTable && linkedTable._closed) {
        container.innerHTML = `<div class="px-4 py-3 border-b border-[#3d362a]">
            <div class="text-[10px] text-red-400 uppercase tracking-wide font-bold mb-1">⚠️ Table closed by DM</div>
            <button onclick="dismissClosedTable()" class="mt-2 text-[10px] text-zinc-400 hover:text-zinc-300 font-bold uppercase">Dismiss</button>
        </div>`;
    } else if (linkedTable) {
        const isApproved = linkedTable._approved;
        const statusIcon = isApproved ? '✅' : '⏳';
        const statusText = isApproved ? 'Linked' : 'Pending approval';
        container.innerHTML = `<div class="px-4 py-3 border-b border-[#3d362a]">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-1">${statusIcon} ${statusText}</div>
            <div class="text-xs text-[#f5efe6] font-bold font-[Cinzel]">${escHtml(linkedTable.campaign_name)}</div>
            <button onclick="unlinkTable()" class="mt-2 text-[10px] text-red-400 hover:text-red-300 font-bold uppercase">Unlink</button>
        </div>`;
    } else {
        container.innerHTML = `<button onclick="openTableLinkModal()" class="w-full text-left px-4 py-3 text-xs text-[#f5efe6] hover:bg-[#2a2418] transition-colors border-b border-[#3d362a]">🔗 Link to Table</button>`;
    }
}

function openTableLinkModal() {
    if (!getUser()) { openAuthModal(); return; }
    document.getElementById('tableLinkInput').value = '';
    document.getElementById('tableLinkModal').classList.remove('hidden');
}

async function submitTableLink() {
    const code = document.getElementById('tableLinkInput').value.trim();
    if (!code) { showAlert('Enter a table code.'); return; }
    const sb = getSupabase();
    const { data: table, error: lookupErr } = await sb.from(TABLE_DM_TABLES).select('id, campaign_name').eq('id', code).single();
    if (lookupErr || !table) { showAlert('Table not found. Check the code and try again.'); return; }
    if (!currentCharacterRowId) {
        const data = gatherData();
        const charName = data.fields?.charName?.trim() || 'My Character';
        const { error: saveErr, id } = await cloudSaveRow(TABLE_CHARACTERS, { character_name: charName }, data);
        if (saveErr) { showAlert('Failed to save character: ' + saveErr); return; }
        if (id) currentCharacterRowId = id;
    }
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: table.id, table_approved: false }).eq('id', currentCharacterRowId);
    if (error) { showAlert('Link failed: ' + error.message); return; }
    linkedTable = table;
    linkedTable._approved = false;
    document.getElementById('tableLinkModal').classList.add('hidden');
    renderTableLink();
    showToast('🔗 Linked to ' + table.campaign_name);
}

async function unlinkFromTable() {
    if (!currentCharacterRowId) return;
    showConfirm('Unlink from this table?', async () => {
        const sb = getSupabase();
        const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: null }).eq('id', currentCharacterRowId);
        if (error) { showAlert('Unlink failed: ' + error.message); return; }
        linkedTable = null;
        renderTableLink();
        showToast('Unlinked from table.');
    });
}
