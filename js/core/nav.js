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
