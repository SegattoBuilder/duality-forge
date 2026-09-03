import SUPABASE_CONFIG from './config.js';
import { PASSWORD_MIN_LENGTH, LS_CONSENT, TABLE_PROFILES } from './constants.js';

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let profileLoading = false;

// ========== SUPABASE CLIENT ==========
export function getSupabase() {
    if (!supabaseClient) {
        const sb = window.supabase;
        if (!sb || !sb.createClient) {
            console.error('Supabase SDK not loaded.');
            return null;
        }
        supabaseClient = sb.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return supabaseClient;
}

export function getUser() { return currentUser; }
export function getProfile() { return currentProfile; }
export function isEmailUser() { return currentUser?.app_metadata?.provider === 'email'; }

// ========== AUTH STATE ==========
let onAuthChangeCallbacks = [];

export function onAuthChange(cb) { onAuthChangeCallbacks.push(cb); }

export async function initAuth() {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session) setUser(session.user);
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showPasswordUpdatePrompt();
        }
        setUser(session?.user || null);
    });
}

function setUser(user) {
    currentUser = user;
    currentProfile = null;
    onAuthChangeCallbacks.forEach(cb => cb(user));
    if (user) loadProfile();
}

// ========== CONSENT ==========
const CONSENT_KEY = LS_CONSENT;

export function hasConsent() { return localStorage.getItem(CONSENT_KEY) === '1'; }

function requireConsent(onAccept) {
    if (hasConsent()) { onAccept(); return; }
    showConsentModal(onAccept);
}

function showConsentModal(onAccept) {
    let modal = document.getElementById('consentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'consentModal';
        modal.className = 'fixed inset-0 modal-overlay z-[9999] p-4 flex items-center justify-center';
        modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-sm">
            <h2 class="font-[Cinzel] text-sm font-bold text-[#d4a017] mb-4 text-center">Before You Continue</h2>
            <div class="space-y-3 mb-5">
                <label class="flex items-start gap-2 cursor-pointer text-xs text-[#f5efe6]">
                    <input type="checkbox" id="consentTerms" class="accent-[#d4a017] mt-0.5">
                    <span>I agree to the <a href="/terms.html" target="_blank" class="text-[#d4a017] underline">Terms of Use</a></span>
                </label>
                <label class="flex items-start gap-2 cursor-pointer text-xs text-[#f5efe6]">
                    <input type="checkbox" id="consentPrivacy" class="accent-[#d4a017] mt-0.5">
                    <span>I agree to the <a href="/privacy.html" target="_blank" class="text-[#d4a017] underline">Privacy Policy</a></span>
                </label>
            </div>
            <div class="flex gap-3">
                <button id="consentAccept" class="flex-1 btn-action text-xs py-3 rounded-xl font-bold uppercase text-white opacity-40 cursor-not-allowed" disabled>Continue</button>
                <button id="consentCancel" class="flex-1 bg-[#2a2418] border border-[#3d362a] text-xs py-3 rounded-xl font-bold uppercase text-[#a89880]">Cancel</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    const termsBox = document.getElementById('consentTerms');
    const privacyBox = document.getElementById('consentPrivacy');
    const acceptBtn = document.getElementById('consentAccept');
    termsBox.checked = false;
    privacyBox.checked = false;
    acceptBtn.disabled = true;
    acceptBtn.classList.add('opacity-40', 'cursor-not-allowed');
    const updateBtn = () => {
        const ok = termsBox.checked && privacyBox.checked;
        acceptBtn.disabled = !ok;
        acceptBtn.classList.toggle('opacity-40', !ok);
        acceptBtn.classList.toggle('cursor-not-allowed', !ok);
    };
    termsBox.onchange = updateBtn;
    privacyBox.onchange = updateBtn;
    acceptBtn.onclick = () => { localStorage.setItem(CONSENT_KEY, '1'); modal.classList.add('hidden'); onAccept(); };
    document.getElementById('consentCancel').onclick = () => modal.classList.add('hidden');
}

// ========== AUTH ACTIONS ==========
export async function signInWithGoogle() {
    const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showAlert('Google sign-in failed: ' + error.message);
}

export async function signInWithEmail(email, password) {
    if (!email || !password) { showAlert('Please enter email and password.'); return; }
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) showAlert('Sign-in failed: ' + error.message);
    return !error;
}

export function signUpWithEmail(email, password) {
    if (!email || !password) { showAlert('Please enter email and password.'); return; }
    if (password.length < PASSWORD_MIN_LENGTH) { showAlert(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`); return; }
    requireConsent(async () => {
        const { error } = await getSupabase().auth.signUp({ email, password });
        if (error) showAlert('Sign-up failed: ' + error.message);
        else showAlert('Check your email for a confirmation link!');
    });
}

export async function resetPassword(email) {
    if (!email) { showAlert('Enter your email address.'); return; }
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/'
    });
    if (error) showAlert('Reset failed: ' + error.message);
    else showAlert('Check your email for a password reset link!');
}

export async function changeEmail(newEmail) {
    if (!newEmail) { showAlert('Enter a new email address.'); return; }
    const { error } = await getSupabase().auth.updateUser({ email: newEmail });
    if (error) showAlert('Change email failed: ' + error.message);
    else showAlert('Check your new email for a confirmation link!');
}

function showPasswordUpdatePrompt() {
    const modal = ensureModal('passwordUpdateModal', `<div class="modal-panel p-6 w-full max-w-sm">
        <div class="border-b border-[#363026] pb-3 mb-5"><h2 class="font-black text-base uppercase font-[Cinzel] tracking-wide" style="color: var(--accent-1, #d4a017)">Set New Password</h2></div>
        <div class="space-y-4">
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">New Password</label><input id="newPasswordInput" type="password" placeholder="••••••••" class="w-full bg-[#1a1714] border border-[#4a3f30] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#d4a017] placeholder-zinc-600"></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Confirm Password</label><input id="confirmPasswordInput" type="password" placeholder="••••••••" class="w-full bg-[#1a1714] border border-[#4a3f30] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#d4a017] placeholder-zinc-600"></div>
            <button id="updatePasswordBtn" class="w-full btn-action text-xs py-3 rounded-xl font-bold uppercase text-white">Update Password</button>
        </div>
    </div>`);
    modal.classList.remove('hidden');
    document.getElementById('updatePasswordBtn').onclick = async () => {
        const pw = document.getElementById('newPasswordInput').value;
        const confirm = document.getElementById('confirmPasswordInput').value;
        if (!pw || pw.length < PASSWORD_MIN_LENGTH) { showAlert(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`); return; }
        if (pw !== confirm) { showAlert('Passwords do not match.'); return; }
        const { error } = await getSupabase().auth.updateUser({ password: pw });
        if (error) showAlert('Update failed: ' + error.message);
        else { modal.classList.add('hidden'); showAlert('Password updated successfully!'); }
    };
}

export async function signOut() {
    await getSupabase().auth.signOut({ scope: 'local' });
    currentUser = null;
    currentProfile = null;
    const clearKeys = Object.keys(localStorage).filter(k => k.startsWith('dh_') && !k.includes('cache') && !k.includes('mode'));
    clearKeys.forEach(k => localStorage.removeItem(k));
    onAuthChangeCallbacks.forEach(cb => cb(null));
}

export async function signOutAll() {
    await getSupabase().auth.signOut({ scope: 'global' });
    currentUser = null;
    currentProfile = null;
    const clearKeys = Object.keys(localStorage).filter(k => k.startsWith('dh_') && !k.includes('cache') && !k.includes('mode'));
    clearKeys.forEach(k => localStorage.removeItem(k));
    onAuthChangeCallbacks.forEach(cb => cb(null));
}

// ========== PROFILE ==========
async function loadProfile() {
    if (!currentUser || currentProfile || profileLoading) return;
    profileLoading = true;
    const { data } = await getSupabase()
        .from(TABLE_PROFILES)
        .select('*')
        .eq('id', currentUser.id)
        .single();
    profileLoading = false;
    if (data) {
        currentProfile = data;
        onAuthChangeCallbacks.forEach(cb => cb(currentUser));
    }
}

export async function saveProfile(profile) {
    if (!currentUser) return false;
    const row = { id: currentUser.id, ...profile };
    const { error } = await getSupabase().from(TABLE_PROFILES).upsert(row);
    if (error) { showAlert('Failed to save profile: ' + error.message); return false; }
    currentProfile = row;
    onAuthChangeCallbacks.forEach(cb => cb(currentUser));
    return true;
}

// ========== GENERIC CLOUD SAVE/LOAD ==========
export async function cloudSaveRow(table, matchFields, data, { isAutosave = false } = {}) {
    if (!currentUser) return { error: 'Not signed in' };
    const sb = getSupabase();

    const query = sb.from(table).select('id').eq('user_id', currentUser.id).eq('is_autosave', isAutosave);
    for (const [k, v] of Object.entries(matchFields)) query.eq(k, v);
    const { data: existing } = await query.limit(1);

    let error, rowId;
    if (existing && existing.length > 0) {
        rowId = existing[0].id;
        ({ error } = await sb.from(table)
            .update({ data, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id));
    } else {
        const { data: inserted, error: insertErr } = await sb.from(table)
            .insert({ user_id: currentUser.id, ...matchFields, data, is_autosave: isAutosave })
            .select('id').single();
        error = insertErr;
        rowId = inserted?.id;
    }
    return { error: error?.message || null, id: rowId || null };
}

export async function cloudLoadRows(table, orderBy = 'updated_at') {
    if (!currentUser) return { rows: [], error: 'Not signed in' };
    const { data: rows, error } = await getSupabase()
        .from(table)
        .select('*')
        .eq('user_id', currentUser.id)
        .order(orderBy, { ascending: false });
    return { rows: rows || [], error: error?.message || null };
}

export async function cloudDeleteRow(table, id) {
    const { error } = await getSupabase().from(table).delete().eq('id', id);
    return { error: error?.message || null };
}

// ========== CUSTOM DIALOGS ==========
function ensureModal(id, html) {
    let modal = document.getElementById(id);
    if (!modal) { modal = document.createElement('div'); modal.id = id; modal.className = 'fixed inset-0 modal-overlay z-[9999] p-4 flex items-center justify-center'; modal.innerHTML = html; document.body.appendChild(modal); }
    return modal;
}

export function showConfirm(message, onYes, onNo) {
    const modal = ensureModal('customConfirmModal', `<div class="modal-panel p-6 w-full max-w-sm text-center"><p id="customConfirmMsg" class="text-sm text-[#f5efe6] mb-5 font-[Cinzel]"></p><div class="flex gap-3"><button id="customConfirmYes" class="flex-1 btn-action text-xs py-3 rounded-xl font-bold uppercase text-white">Yes</button><button id="customConfirmNo" class="flex-1 bg-[#2a2418] border border-[#3d362a] text-xs py-3 rounded-xl font-bold uppercase text-[#a89880]">No</button></div></div>`);
    document.getElementById('customConfirmMsg').innerHTML = message;
    modal.classList.remove('hidden');
    const cleanup = () => { modal.classList.add('hidden'); };
    document.getElementById('customConfirmYes').onclick = () => { cleanup(); if (onYes) onYes(); };
    document.getElementById('customConfirmNo').onclick = () => { cleanup(); if (onNo) onNo(); };
}

export function showAlert(message) {
    const modal = ensureModal('customAlertModal', `<div class="modal-panel p-6 w-full max-w-sm text-center"><p id="customAlertMsg" class="text-sm text-[#f5efe6] mb-5 font-[Cinzel]"></p><button id="customAlertOk" class="w-full btn-action text-xs py-3 rounded-xl font-bold uppercase text-white">OK</button></div>`);
    document.getElementById('customAlertMsg').textContent = message;
    modal.classList.remove('hidden');
    document.getElementById('customAlertOk').onclick = () => modal.classList.add('hidden');
}

// ========== UTILITIES ==========
export function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function escHtmlAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
