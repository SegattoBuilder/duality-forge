import { getUser, getProfile, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut as coreSignOut, saveProfile as coreSaveProfile, cloudSaveRow, cloudLoadRows, cloudDeleteRow, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { creatures, setCreatures, actionCounters, setActionCounters, fearFilled, setFearFilled, autoCache, renderGrid, renderFearDots } from './tracker.js';
import { vaultCreatures, setVaultCreatures, autoCacheVault, renderVaultGrid } from './vault.js';
import { chronicleEntries, setChronicleEntries, autoCacheChronicle, renderChronicle } from './chronicle.js';
import { CAMPAIGN_KEY, switchTab } from './app.js';

let cloudDirty = false;
let cloudAutoSaveInterval = null;
let syncStatusTimer = null;

export function initDmAuth() {
    onAuthChange(renderAuthUI);
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    window._markCloudDirty = () => { if (getUser()) cloudDirty = true; };
}

function showSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    el.textContent = text; el.classList.remove('hidden');
    if (syncStatusTimer) clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => el.classList.add('hidden'), 10000);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    toast.querySelector('.font-bold').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    cloudAutoSaveInterval = setInterval(async () => {
        if (!getUser() || !cloudDirty) return;
        cloudDirty = false; await cloudSave();
    }, 5 * 60 * 1000);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    cloudDirty = false;
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) { openAuthModal(); return; }
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    const data = { creatures: creatures(), actionCounters: actionCounters(), fearFilled: fearFilled(), campaign, vaultCreatures: vaultCreatures(), chronicleEntries: chronicleEntries() };
    const { error } = await cloudSaveRow('sessions', { campaign_name: campaign }, data);
    if (error) showAlert('Cloud save failed: ' + error);
    else showSyncStatus('☁️ Saved');
}

async function cloudLoad() {
    if (!getUser()) { openAuthModal(); return; }
    const { rows, error } = await cloudLoadRows('sessions');
    if (error) { showAlert('Cloud load failed: ' + error); return; }
    if (!rows.length) { showAlert('No cloud saves found.'); return; }
    const picker = document.getElementById('cloudSessionList');
    picker.innerHTML = rows.map(s => `<div class="flex items-center gap-2 p-3 bg-[#1a1714] border border-[#4a3f30] rounded-xl hover:border-[#d4a017] cursor-pointer transition-colors" onclick="window._loadCloudSession('${s.id}')">
        <div class="flex-1"><div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${escHtml(s.campaign_name)}</div><div class="text-[10px] text-zinc-500">${new Date(s.updated_at).toLocaleString()}</div></div>
        <button onclick="event.stopPropagation(); window._deleteCloudSession('${s.id}')" class="text-zinc-700 hover:text-red-500 text-sm" title="Delete">🗑</button>
    </div>`).join('');
    document.getElementById('cloudPickerModal').classList.remove('hidden');
}

async function loadCloudSession(sessionId) {
    const { rows } = await cloudLoadRows('sessions');
    const session = rows.find(r => r.id === sessionId);
    if (!session) { showAlert('Failed to load session.'); return; }
    const d = session.data;
    setCreatures(d.creatures || []); setActionCounters(d.actionCounters || []); setFearFilled(d.fearFilled || 0);
    setVaultCreatures(d.vaultCreatures || []); setChronicleEntries(d.chronicleEntries || []);
    if (d.campaign) { document.getElementById('campaignName').value = d.campaign; localStorage.setItem(CAMPAIGN_KEY, d.campaign); }
    autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
    closeCloudPicker(); showSyncStatus('☁️ Loaded');
}

async function deleteCloudSession(sessionId) {
    showConfirm('Delete this cloud save?', async () => {
        const { error } = await cloudDeleteRow('sessions', sessionId);
        if (error) showAlert('Delete failed: ' + error); else cloudLoad();
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
        setCreatures([]); setActionCounters([]); setFearFilled(0); setVaultCreatures([]); setChronicleEntries([]);
        document.getElementById('campaignName').value = '';
        localStorage.removeItem(CAMPAIGN_KEY);
        autoCache(); autoCacheVault(); autoCacheChronicle(); renderFearDots(); renderGrid(); renderVaultGrid(); renderChronicle();
        switchTab('tracker');
    };
    if (cloudDirty) {
        showConfirm('You have unsaved changes. Save to cloud before signing out?',
            async () => { await cloudSave(); await finishSignOut(); },
            finishSignOut
        );
        return;
    }
    await finishSignOut();
}

// ========== AUTH UI ==========
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); document.getElementById('authEmail').value = ''; document.getElementById('authPassword').value = ''; }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function closeCloudPicker() { document.getElementById('cloudPickerModal').classList.add('hidden'); }

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
window._loadCloudSession = loadCloudSession;
window._deleteCloudSession = deleteCloudSession;
window.closeCloudPicker = closeCloudPicker;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfile = doSaveProfile;
