import SUPABASE_CONFIG from './config.js';

export async function requireAuth(localStorageKeys = []) {
    const sb = window.supabase?.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    if (!sb) { window.location.replace('/'); return false; }

    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.replace('/'); return false; }

    const fromDashboard = sessionStorage.getItem('dh_dashboard_pick') || sessionStorage.getItem('dh_dashboard_new');
    if (fromDashboard) return true;

    if (!localStorageKeys.length) return true;

    const hasLocal = localStorageKeys.some(k => {
        const v = localStorage.getItem(k);
        if (!v) return false;
        try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed.length > 0 : !!parsed; } catch { return !!v; }
    });

    if (!hasLocal) { window.location.replace('/'); return false; }
    return true;
}
