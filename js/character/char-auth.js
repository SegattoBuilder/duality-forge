import { initAuth, getUser, getProfile, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut as coreSignOut, saveProfile as coreSaveProfile, cloudSaveRow, cloudLoadRows, cloudDeleteRow, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { gatherData, applyData, autoCache, resetSheet } from './save.js';
import { SAVE_KEY } from './state.js';

let cloudAutoSaveInterval = null;
let lastSavedSnapshot = null;
let syncStatusTimer = null;
let characterPickerShown = false;

export function initCharAuth() {
    onAuthChange(renderAuthUI);
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    onAuthChange(user => {
        if (user && !characterPickerShown) {
            characterPickerShown = true;
            const localRaw = localStorage.getItem(SAVE_KEY);
            let hasLocal = false;
            try { const d = JSON.parse(localRaw); hasLocal = d && (d.fields?.charName || (d.cards && d.cards.length)); } catch {}
            if (!hasLocal) showCharacterPicker();
        }
    });
    window._ensureCharacterPicker = () => {
        if (getUser() && !characterPickerShown) {
            characterPickerShown = true;
            const localRaw = localStorage.getItem(SAVE_KEY);
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
    syncStatusTimer = setTimeout(() => el.classList.add('hidden'), 10000);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    if (!toast) return;
    const bold = toast.querySelector('.font-bold');
    if (bold) bold.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
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
    }, 30 * 1000);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    lastSavedSnapshot = null;
}

async function cloudAutoSaveNow() {
    const data = gatherData();
    const charName = data.fields?.charName?.trim() || 'My Character';
    const { error } = await cloudSaveRow('characters', { character_name: charName }, data, { isAutosave: true });
    if (!error) showSyncStatus('☁️ Auto-saved');
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const data = gatherData();
    const charName = data.fields?.charName?.trim() || 'My Character';
    const { error } = await cloudSaveRow('characters', { character_name: charName }, data);
    if (error) showAlert('Cloud save failed: ' + error);
    else { lastSavedSnapshot = JSON.stringify(data); showSyncStatus('☁️ Saved'); }
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    showCloudPicker({
        table: 'characters', nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { showAlert('No local data found to import.'); return; }
    showConfirm('Upload your current local data to the cloud as a new save?', async () => { await cloudSave(); });
}

async function doSignOut() {
    await coreSignOut();
    resetSheet();
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
        btn.className = 'h-10 px-3 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#4a3f30] hover:border-[#d4a017] transition-colors';
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
        dm_experience: document.getElementById('profileExperience').value || null
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
window.signOut = doSignOut;
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window.closeCharacterPicker = closeCharacterPicker;
window.startNewCharacter = startNewCharacter;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;

// ========== CHARACTER PICKER ==========
function applyCharacterRow(row) {
    applyData(row.data);
    localStorage.setItem(SAVE_KEY, JSON.stringify(row.data));
    showSyncStatus('☁️ Loaded');
}

async function showCharacterPicker() {
    showCloudPicker({
        table: 'characters', nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

function closeCharacterPicker() { document.getElementById('characterPickerModal').classList.add('hidden'); }

function startNewCharacter() {
    closeCharacterPicker();
    resetSheet();
}
