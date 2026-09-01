import { initAuth, getUser, getProfile, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut as coreSignOut, saveProfile as coreSaveProfile, cloudSaveRow, cloudLoadRows, cloudDeleteRow, escHtml, escHtmlAttr } from '../core/auth.js';
import { gatherData, applyData, autoCache } from './save.js';
import { SAVE_KEY } from './state.js';

let cloudDirty = false;
let cloudAutoSaveInterval = null;
let syncStatusTimer = null;

export function initCharAuth() {
    initAuth();
    onAuthChange(renderAuthUI);
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    window._markCloudDirty = () => { if (getUser()) cloudDirty = true; };
    document.addEventListener('input', () => { if (getUser()) cloudDirty = true; });
    document.addEventListener('change', () => { if (getUser()) cloudDirty = true; });
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
    cloudAutoSaveInterval = setInterval(async () => {
        if (!getUser() || !cloudDirty) return;
        cloudDirty = false; await cloudSave();
    }, 30 * 1000);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    cloudDirty = false;
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const data = gatherData();
    const charName = data.fields?.charName?.trim() || 'My Character';
    const { error } = await cloudSaveRow('characters', { character_name: charName }, data);
    if (error) alert('Cloud save failed: ' + error);
    else showSyncStatus('☁️ Saved');
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    const { rows, error } = await cloudLoadRows('characters');
    if (error) { alert('Cloud load failed: ' + error); return; }
    if (!rows.length) { alert('No cloud saves found.'); return; }
    const picker = document.getElementById('cloudSessionList');
    picker.innerHTML = rows.map(s => `<div class="flex items-center gap-2 p-3 bg-[#1a1714] border border-[#4a3f30] rounded-xl hover:border-[#d4a017] cursor-pointer transition-colors" onclick="window._loadCloudChar('${s.id}')">
        <div class="flex-1"><div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${escHtml(s.character_name)}</div><div class="text-[10px] text-zinc-500">${new Date(s.updated_at).toLocaleString()}</div></div>
        <button onclick="event.stopPropagation(); window._deleteCloudChar('${s.id}')" class="text-zinc-700 hover:text-red-500 text-sm" title="Delete">🗑</button>
    </div>`).join('');
    document.getElementById('cloudPickerModal').classList.remove('hidden');
}

async function loadCloudChar(charId) {
    const { rows } = await cloudLoadRows('characters');
    const row = rows.find(r => r.id === charId);
    if (!row) { alert('Failed to load character.'); return; }
    applyData(row.data);
    localStorage.setItem(SAVE_KEY, JSON.stringify(row.data));
    closeCloudPicker(); showSyncStatus('☁️ Loaded');
}

async function deleteCloudChar(charId) {
    if (!confirm('Delete this cloud save?')) return;
    const { error } = await cloudDeleteRow('characters', charId);
    if (error) alert('Delete failed: ' + error); else cloudLoad();
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { alert('No local data found to import.'); return; }
    if (!confirm('Upload your current local data to the cloud as a new save?')) return;
    await cloudSave();
}

async function doSignOut() {
    if (cloudDirty) { const save = confirm('You have unsaved changes. Save to cloud before signing out?'); if (save) await cloudSave(); }
    await coreSignOut();
}

// ========== AUTH UI ==========
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); document.getElementById('authEmail').value = ''; document.getElementById('authPassword').value = ''; }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function closeCloudPicker() { document.getElementById('cloudPickerModal').classList.add('hidden'); }

let authMenuHandler = null;
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
window.closeAuthModal = closeAuthModal;
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = () => signInWithEmail(document.getElementById('authEmail').value.trim(), document.getElementById('authPassword').value);
window.signUpWithEmail = () => signUpWithEmail(document.getElementById('authEmail').value.trim(), document.getElementById('authPassword').value);
window.signOut = doSignOut;
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window._loadCloudChar = loadCloudChar;
window._deleteCloudChar = deleteCloudChar;
window.closeCloudPicker = closeCloudPicker;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;
