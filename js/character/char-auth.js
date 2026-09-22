import { initAuth, getUser, getProfile, getSupabase, onAuthChange, showConfirm, showAlert } from '../core/auth.js';
import { escHtml } from '../core/utils.js';
import { showCloudPicker } from '../core/cloud-picker.js';
import { TOAST_DURATION, AUTOSAVE_INTERVAL, TABLE_CHARACTERS, TABLE_DM_TABLES, LS_CHAR_SAVE, LS_CHAR_ROW_ID } from '../core/constants.js';
import { gatherData, applyData, autoCache, resetSheet } from './save.js';

let cloudAutoSaveInterval = null;
let lastSavedSnapshot = null;
let characterPickerShown = false;
let linkedTable = null;
let currentCharacterRowId = localStorage.getItem(LS_CHAR_ROW_ID) || null;
const isNewFromDashboard = sessionStorage.getItem('dh_dashboard_new') === 'character';

function setCharacterRowId(id) {
    currentCharacterRowId = id;
    if (id) localStorage.setItem(LS_CHAR_ROW_ID, id);
    else localStorage.removeItem(LS_CHAR_ROW_ID);
}

export function initCharAuth() {
    onAuthChange(() => renderTableLink());
    onAuthChange(user => { if (user) startCloudAutoSave(); else stopCloudAutoSave(); });
    onAuthChange(async user => {
        renderTableLink();
        if (user && !characterPickerShown) {
            characterPickerShown = true;
            if (await tryDashboardPick()) return;
            if (isNewFromDashboard) return;
            if (currentCharacterRowId) return;
            const localRaw = localStorage.getItem(LS_CHAR_SAVE);
            let hasLocal = false;
            try { const d = JSON.parse(localRaw); hasLocal = d && (d.fields?.charName || (d.cards && d.cards.length)); } catch {}
            if (!hasLocal) showCharacterPicker();
        }
    });
    window._ensureCharacterPicker = () => {
        if (getUser() && !characterPickerShown) {
            characterPickerShown = true;
            const localRaw = localStorage.getItem(LS_CHAR_SAVE);
            let hasLocal = false;
            try { const d = JSON.parse(localRaw); hasLocal = d && (d.fields?.charName || (d.cards && d.cards.length)); } catch {}
            if (!hasLocal) showCharacterPicker();
        }
    };
}

async function tryDashboardPick() {
    const raw = sessionStorage.getItem('dh_dashboard_pick');
    if (!raw) return false;
    sessionStorage.removeItem('dh_dashboard_pick');
    try {
        const pick = JSON.parse(raw);
        if (pick.type !== 'character' || !pick.id) return false;
        const sb = getSupabase();
        const { data: row } = await sb.from(TABLE_CHARACTERS).select('*').eq('id', pick.id).single();
        if (!row) return false;
        applyCharacterRow(row);
        return true;
    } catch { return false; }
}

let syncAnimationTimer = null;

function showSyncStatus() {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    btn.classList.remove('saved');
    void btn.offsetWidth;
    btn.classList.add('saved');
    if (syncAnimationTimer) clearTimeout(syncAnimationTimer);
    syncAnimationTimer = setTimeout(() => btn.classList.remove('saved'), 2500);
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    if (!toast) return;
    const bold = toast.querySelector('.font-bold');
    if (bold) bold.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}

function isDirty() {
    if (!lastSavedSnapshot) return false;
    return JSON.stringify(gatherData()) !== lastSavedSnapshot;
}

function onBeforeUnload(e) {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    lastSavedSnapshot = JSON.stringify(gatherData());
    window.addEventListener('beforeunload', onBeforeUnload);
    cloudAutoSaveInterval = setInterval(async () => {
        if (!getUser()) return;
        const current = JSON.stringify(gatherData());
        if (current === lastSavedSnapshot) return;
        lastSavedSnapshot = current;
        await cloudAutoSaveNow();
    }, AUTOSAVE_INTERVAL);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) { clearInterval(cloudAutoSaveInterval); cloudAutoSaveInterval = null; }
    window.removeEventListener('beforeunload', onBeforeUnload);
    lastSavedSnapshot = null;
}

async function cloudAutoSaveNow() {
    if (!currentCharacterRowId) return;
    const sb = getSupabase();
    const data = gatherData();
    const charName = data.fields?.charName?.trim();
    const { error } = await sb.from(TABLE_CHARACTERS)
        .update({ data, character_name: charName || undefined, updated_at: new Date().toISOString() })
        .eq('id', currentCharacterRowId);
    if (!error) showSyncStatus();
    await refreshTableApproval();
}

async function refreshTableApproval() {
    if (!currentCharacterRowId) return;
    const sb = getSupabase();
    const { data } = await sb.from(TABLE_CHARACTERS).select('table_id, table_approved').eq('id', currentCharacterRowId).single();
    if (!data) return;

    // DM kicked or denied — player clears their own table_id
    if (data.table_approved === 'kicked' || data.table_approved === 'denied') {
        const msg = data.table_approved === 'kicked' ? 'You have been removed from the table by the DM.' : 'Your request to join the table was denied.';
        await sb.from(TABLE_CHARACTERS).update({ table_id: null, table_approved: null }).eq('id', currentCharacterRowId);
        linkedTable = null;
        renderTableLink();
        showAlert(msg);
        return;
    }

    if (!data.table_id && data.table_approved === null) {
        linkedTable = { _closed: true };
        renderTableLink();
        return;
    }
    if (!data.table_id) {
        if (linkedTable) { linkedTable = null; renderTableLink(); }
        return;
    }
    if (!linkedTable || linkedTable._closed) return;
    const wasApproved = linkedTable._approved;
    linkedTable._approved = data.table_approved === 'true';
    if (wasApproved !== linkedTable._approved) renderTableLink();
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!getUser()) return;
    const sb = getSupabase();
    const data = gatherData();
    const charName = data.fields?.charName?.trim();
    if (!charName) { showAlert('Character name is required to save.'); return; }

    if (currentCharacterRowId) {
        const { error } = await sb.from(TABLE_CHARACTERS)
            .update({ data, character_name: charName, updated_at: new Date().toISOString() })
            .eq('id', currentCharacterRowId);
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
    } else {
        const { data: row, error } = await sb.from(TABLE_CHARACTERS)
            .insert({ user_id: getUser().id, character_name: charName, data })
            .select('id').single();
        if (error) { showAlert('Cloud save failed: ' + error.message); return; }
        setCharacterRowId(row.id);
    }
    lastSavedSnapshot = JSON.stringify(gatherData());
    renderTableLink();
    showSyncStatus();
}

async function cloudLoad() {
    if (!getUser()) return;
    showCloudPicker({
        table: TABLE_CHARACTERS, nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

async function importLocalToCloud() {
    if (!getUser()) return;
    const raw = localStorage.getItem(LS_CHAR_SAVE);
    if (!raw) { showAlert('No local data found to import.'); return; }
    showConfirm('Upload your current local data to the cloud as a new save?', async () => { await cloudSave(); });
}



// ========== WINDOW BINDINGS ==========
window.cloudSave = cloudSave;
window.cloudLoad = cloudLoad;
window.importLocalToCloud = importLocalToCloud;
window.closeCharacterPicker = closeCharacterPicker;
window.startNewCharacter = startNewCharacter;
window.openTableLinkModal = openTableLinkModal;
window.closeTableLinkModal = () => document.getElementById('tableLinkModal').classList.add('hidden');
window.submitTableLink = submitTableLink;
window.unlinkTable = unlinkFromTable;
window.dismissClosedTable = () => {
    if (!currentCharacterRowId) return;
    const sb = getSupabase();
    sb.from(TABLE_CHARACTERS).update({ table_approved: 'false' }).eq('id', currentCharacterRowId).then(() => {
        linkedTable = null;
        renderTableLink();
    });
};

// ========== CHARACTER PICKER ==========
function applyCharacterRow(row) {
    const d = row.data || {};
    applyData(d);
    const name = d.fields?.charName || row.character_name || '';
    if (name) document.getElementById('charName').value = name;
    localStorage.setItem(LS_CHAR_SAVE, JSON.stringify(gatherData()));
    setCharacterRowId(row.id);
    lastSavedSnapshot = JSON.stringify(gatherData());
    linkedTable = null;
    if (row.table_id) loadLinkedTable(row.table_id, row.table_approved);
    else if (!row.table_id && row.table_approved === null) { linkedTable = { _closed: true }; renderTableLink(); }
    else renderTableLink();
    showSyncStatus();
}

async function showCharacterPicker() {
    showCloudPicker({
        table: TABLE_CHARACTERS, nameColumn: 'character_name',
        modalId: 'characterPickerModal', listId: 'characterPickerList',
        onPick: applyCharacterRow, emptyText: 'No saved characters found.'
    });
}

function closeCharacterPicker() { document.getElementById('characterPickerModal').classList.add('hidden'); }

function startNewCharacter() {
    closeCharacterPicker();
    resetSheet();
    setCharacterRowId(null);
    linkedTable = null;
    renderTableLink();
}

// ========== TABLE LINK / UNLINK ==========

async function loadLinkedTable(tableId, approved) {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from(TABLE_DM_TABLES).select('id, campaign_name').eq('id', tableId).single();
    if (data) {
        linkedTable = data;
        linkedTable._approved = approved || false;
    } else {
        linkedTable = null;
    }
    renderTableLink();
}

function renderTableLink() {
    const container = document.getElementById('tableLinkStatus');
    if (!container) return;
    if (!getUser()) {
        container.innerHTML = '';
        return;
    }
    if (linkedTable && linkedTable._closed) {
        container.innerHTML = `<button onclick="dismissClosedTable()" class="btn-nav border-none text-2xl" title="Table closed by DM">⚠️</button>`;
    } else if (linkedTable) {
        const icon = linkedTable._approved ? '✅' : '⏳';
        container.innerHTML = `<span class="btn-nav border-none text-2xl pointer-events-none" title="${linkedTable._approved ? 'Linked' : 'Pending'}: ${escHtml(linkedTable.campaign_name)}">📋</span>`;
    } else {
        container.innerHTML = `<button onclick="openTableLinkModal()" class="btn-nav border-none text-2xl" title="Link to Table">🔗</button>`;
    }
}

function openTableLinkModal() {
    if (!getUser()) return;
    document.getElementById('tableLinkInput').value = '';
    document.getElementById('tableLinkModal').classList.remove('hidden');
}

async function submitTableLink() {
    const code = document.getElementById('tableLinkInput').value.trim();
    if (!code) { showAlert('Enter a table code.'); return; }
    const sb = getSupabase();
    const { data: table, error: lookupErr } = await sb.from(TABLE_DM_TABLES).select('id, campaign_name').eq('id', code).single();
    if (lookupErr || !table) { showAlert('Table not found. Check the code and try again.'); return; }
    if (!currentCharacterRowId) {
        const data = gatherData();
        const charName = data.fields?.charName?.trim() || 'My Character';
        const sb2 = getSupabase();
        const { data: row, error: saveErr } = await sb2.from(TABLE_CHARACTERS)
            .insert({ user_id: getUser().id, character_name: charName, data })
            .select('id').single();
        if (saveErr) { showAlert('Failed to save character: ' + saveErr.message); return; }
        setCharacterRowId(row.id);
    }
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: table.id, table_approved: 'false' }).eq('id', currentCharacterRowId);
    if (error) { showAlert('Link failed: ' + error.message); return; }
    linkedTable = table;
    linkedTable._approved = false;
    document.getElementById('tableLinkModal').classList.add('hidden');
    renderTableLink();
    showToast('🔗 Linked to ' + table.campaign_name);
}

async function unlinkFromTable() {
    if (!currentCharacterRowId) return;
    showConfirm('Unlink from this table?', async () => {
        const sb = getSupabase();
        const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: null }).eq('id', currentCharacterRowId);
        if (error) { showAlert('Unlink failed: ' + error.message); return; }
        linkedTable = null;
        renderTableLink();
        showToast('Unlinked from table.');
    });
}
