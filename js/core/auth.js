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
    if (error) alert('Google sign-in failed: ' + error.message);
}

export async function signInWithEmail(email, password) {
    if (!email || !password) { alert('Please enter email and password.'); return; }
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) alert('Sign-in failed: ' + error.message);
    return !error;
}

export async function signUpWithEmail(email, password) {
    if (!email || !password) { alert('Please enter email and password.'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) alert('Sign-up failed: ' + error.message);
    else alert('Check your email for a confirmation link!');
    return !error;
}

export async function signOut() {
    await getSupabase().auth.signOut();
    currentUser = null;
    currentProfile = null;
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
    if (error) { alert('Failed to save profile: ' + error.message); return false; }
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

// ========== UTILITIES ==========
export function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function escHtmlAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
