// Keeps the open save (campaign / character) in the URL so every history entry
// knows exactly which save it shows — Back/Forward can't mix one save's name with another's data.

const PICK_KEY = 'dh_dashboard_pick';

// If the URL names a save that isn't the one cached locally, queue it to load from the cloud
export function pickFromUrl(type, param, cachedId) {
    const id = new URLSearchParams(location.search).get(param);
    if (!id || id === cachedId || sessionStorage.getItem(PICK_KEY)) return;
    sessionStorage.setItem(PICK_KEY, JSON.stringify({ type, id }));
}

export function setUrlParam(param, value) {
    const url = new URL(location.href);
    if (value) url.searchParams.set(param, value);
    else url.searchParams.delete(param);
    if (url.href !== location.href) history.replaceState(history.state, '', url);
}

// A page restored from the back/forward cache holds stale in-memory state (localStorage may
// belong to a save opened later) — reload so it rebuilds from the URL + current storage.
export function reloadOnBackForwardRestore() {
    window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
}

// Hide page content while a picked save loads, so the previous save's cached data doesn't flash
export function hideUntilLoaded(timeoutMs = 6000) {
    document.documentElement.classList.add('save-loading');
    setTimeout(showLoaded, timeoutMs);
}

export function showLoaded() {
    document.documentElement.classList.remove('save-loading');
}

// The picked save couldn't be opened — reload with the local copy and explain why
export function pickFailed(message) {
    sessionStorage.setItem('dh_flash', message);
    location.replace(location.pathname);
}

export function takeFlash() {
    const msg = sessionStorage.getItem('dh_flash');
    if (msg) sessionStorage.removeItem('dh_flash');
    return msg;
}
