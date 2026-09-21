export function filterByArchived(rows, archived) {
    return rows.filter(r => archived ? r.archived_at : !r.archived_at);
}

export function detectJsonType(json) {
    if (!json || typeof json !== 'object') return null;
    if (json.fields || json.cards) return 'character';
    if (json.creatures !== undefined || json.vaultCreatures !== undefined || json.chronicleEntries !== undefined) return 'table';
    if (json.data) return detectJsonType(json.data);
    return null;
}

export function formatRelativeDate(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}
