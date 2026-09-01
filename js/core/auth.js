import SUPABASE_CONFIG from './config.js';

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

// ========== AUTH STATE ==========
let onAuthChangeCallbacks = [];

export function onAuthChange(cb) { onAuthChangeCallbacks.push(cb); }

export async function initAuth() {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session) setUser(session.user);
    sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
    });
}

function setUser(user) {
    currentUser = user;
    currentProfile = null;
    onAuthChangeCallbacks.forEach(cb => cb(user));
    if (user) loadProfile();
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

export async function signUpWithEmail(email, password) {
    if (!email || !password) { showAlert('Please enter email and password.'); return; }
    if (password.length < 6) { showAlert('Password must be at least 6 characters.'); return; }
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) showAlert('Sign-up failed: ' + error.message);
    else showAlert('Check your email for a confirmation link!');
    return !error;
}

export async function signOut() {
    await getSupabase().auth.signOut();
    currentUser = null;
    currentProfile = null;
    // Clear all tool data from localStorage (keep caches/mode prefs)
    const clearKeys = Object.keys(localStorage).filter(k => k.startsWith('dh_') && !k.includes('cache') && !k.includes('mode'));
    clearKeys.forEach(k => localStorage.removeItem(k));
    onAuthChangeCallbacks.forEach(cb => cb(null));
}

// ========== PROFILE ==========
async function loadProfile() {
    if (!currentUser || currentProfile || profileLoading) return;
    profileLoading = true;
    const { data } = await getSupabase()
        .from('profiles')
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
    const { error } = await getSupabase().from('profiles').upsert(row);
    if (error) { showAlert('Failed to save profile: ' + error.message); return false; }
    currentProfile = row;
    onAuthChangeCallbacks.forEach(cb => cb(currentUser));
    return true;
}

// ========== GENERIC CLOUD SAVE/LOAD ==========
export async function cloudSaveRow(table, matchFields, data) {
    if (!currentUser) return { error: 'Not signed in' };
    const sb = getSupabase();

    const query = sb.from(table).select('id');
    for (const [k, v] of Object.entries(matchFields)) query.eq(k, v);
    const { data: existing } = await query.limit(1);

    let error;
    if (existing && existing.length > 0) {
        ({ error } = await sb.from(table)
            .update({ data, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id));
    } else {
        ({ error } = await sb.from(table)
            .insert({ user_id: currentUser.id, ...matchFields, data }));
    }
    return { error: error?.message || null };
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
    document.getElementById('customConfirmMsg').textContent = message;
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
