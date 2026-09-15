import { TABLE_DM_TABLES, TABLE_CHARACTERS } from './constants.js';
import { formatRelativeDate } from './dashboard-logic.js';
import { escHtml } from './utils.js';

let supabase = null;
let userId = null;

export function initDashboard(sb, uid) {
    supabase = sb;
    userId = uid;
}

export async function renderDashboard(container) {
    container.innerHTML = '<div class="text-center text-zinc-600 text-xs py-8">Loading saves…</div>';

    const [tables, characters] = await Promise.all([
        loadRows(TABLE_DM_TABLES, 'campaign_name'),
        loadRows(TABLE_CHARACTERS, 'character_name, table_id, autosave_data, autosave_at')
    ]);

    const tableMap = await buildTableMap(tables, characters);
    const sortedTables = tables.slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const sortedChars = characters.slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    if (!sortedTables.length && !sortedChars.length) {
        container.innerHTML = `<div class="text-center py-8">
            <p class="text-zinc-500 text-sm mb-4">No saves yet. Start forging!</p>
            <button id="dashNewBtn" class="btn-primary-pill px-6 py-2">+ New</button>
        </div>`;
        wireNewButton(container);
        return;
    }

    let html = `<div class="flex items-center justify-between mb-6">
        <div></div>
        <button id="dashNewBtn" class="btn-primary-pill px-4 py-2">+ New</button>
    </div>`;

    if (sortedTables.length) html += sectionHtml('⚒️ Tables', sortedTables, 'dm', tableMap);
    if (sortedChars.length) html += sectionHtml('🗡️ Characters', sortedChars, 'character', tableMap);

    container.innerHTML = html;
    wireNewButton(container);
    wireCards(container, sortedTables, sortedChars);
}

async function buildTableMap(tableRows, charRows) {
    const map = {};
    for (const r of tableRows) map[r.id] = r.campaign_name || 'Unnamed';
    const missingIds = [];
    for (const c of charRows) {
        if (c.table_id && !map[c.table_id]) missingIds.push(c.table_id);
    }
    if (missingIds.length) {
        const { data } = await supabase.from(TABLE_DM_TABLES).select('id, campaign_name').in('id', [...new Set(missingIds)]);
        if (data) for (const r of data) map[r.id] = r.campaign_name || 'Unnamed';
    }
    return map;
}

function sectionHtml(title, rows, type, tableMap) {
    const cards = rows.map(r => cardHtml(r, type, tableMap)).join('');
    return `<div class="mb-6">
        <h3 class="font-[Cinzel] text-xs font-bold uppercase tracking-wide text-zinc-500 mb-3">${title}</h3>
        <div class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory" style="scrollbar-width:thin;scrollbar-color:#3d362a transparent">${cards}</div>
    </div>`;
}

function cardHtml(row, type, tableMap) {
    const name = row.campaign_name || row.character_name || 'Unnamed';
    const date = row.updated_at ? formatRelativeDate(row.updated_at) : '';
    const icon = type === 'dm' ? '⚒️' : '🗡️';
    const hasAutosave = row.autosave_data && row.autosave_at;
    const badge = hasAutosave ? '<span class="text-[9px] text-zinc-600">2 saves</span>' : '';

    let linkedHtml = '';
    if (type === 'character' && row.table_id && tableMap[row.table_id]) {
        linkedHtml = `<div class="text-[9px] text-zinc-500 truncate mt-1">🔗 ${escHtml(tableMap[row.table_id])}</div>`;
    }

    return `<button class="dash-card picker-card text-left flex-shrink-0 w-44 snap-start" data-type="${type}" data-row-id="${row.id}">
        <div class="flex items-center gap-2 mb-1">
            <span class="text-base">${icon}</span>
            <span class="text-xs font-bold text-[#f5efe6] font-[Cinzel] truncate">${escHtml(name)}</span>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-[10px] text-zinc-500">${date}</span>
            ${badge}
        </div>
        ${linkedHtml}
    </button>`;
}

function wireNewButton(container) {
    const btn = container.querySelector('#dashNewBtn');
    if (!btn) return;
    btn.addEventListener('click', () => showNewMenu());
}

function wireCards(container, tableRows, charRows) {
    container.querySelectorAll('.dash-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            const id = card.dataset.rowId;
            const rows = type === 'dm' ? tableRows : charRows;
            const row = rows.find(r => r.id === id);
            if (!row) return;
            showSavePicker(type, row, container);
        });
    });
}

function showSavePicker(type, row, dashContainer) {
    let modal = document.getElementById('dashSavePickerModal');
    if (modal) modal.remove();

    const name = row.campaign_name || row.character_name || 'Unnamed';
    const icon = type === 'dm' ? '⚒️' : '🗡️';
    const table = type === 'dm' ? TABLE_DM_TABLES : TABLE_CHARACTERS;
    const saveDate = new Date(row.updated_at).toLocaleString();

    let saveBtns = `<button data-pick="save" class="picker-card flex-1 text-left">
        <div class="text-[10px] font-bold uppercase mb-1" style="color:var(--accent-1)">Save</div>
        <div class="text-[10px] text-zinc-500">${saveDate}</div>
    </button>`;

    if (row.autosave_data && row.autosave_at) {
        const autoDate = new Date(row.autosave_at).toLocaleString();
        saveBtns += `<button data-pick="autosave" class="picker-card picker-card-auto flex-1 text-left">
            <div class="text-[10px] font-bold text-green-400 uppercase mb-1">Autosave</div>
            <div class="text-[10px] text-zinc-500">${autoDate}</div>
        </button>`;
    }

    modal = document.createElement('div');
    modal.id = 'dashSavePickerModal';
    modal.className = 'fixed inset-0 modal-overlay z-50 p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-xs">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <span class="text-lg">${icon}</span>
                <h2 class="font-[Cinzel] text-sm font-bold" style="color:var(--accent-1)">${escHtml(name)}</h2>
            </div>
            <button data-delete class="text-red-400/60 hover:text-red-400 text-base" title="Delete">🗑</button>
        </div>
        <div class="flex gap-2">${saveBtns}</div>
        <button class="w-full text-center text-[10px] text-zinc-600 mt-4 hover:text-zinc-400" data-close>Cancel</button>
    </div>`;

    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('[data-close]').addEventListener('click', close);

    modal.querySelector('[data-pick="save"]').addEventListener('click', () => { close(); navigateTo(type, row.id); });
    const autoBtn = modal.querySelector('[data-pick="autosave"]');
    if (autoBtn) autoBtn.addEventListener('click', () => { close(); navigateTo(type, row.id, true); });

    modal.querySelector('[data-delete]').addEventListener('click', () => {
        showDeleteConfirm(name, async () => {
            if (type === 'dm') {
                await supabase.from(TABLE_CHARACTERS).update({ table_id: null, table_approved: null }).eq('table_id', row.id);
            }
            await supabase.from(table).delete().eq('id', row.id);
            close();
            renderDashboard(dashContainer);
        });
    });

    document.body.appendChild(modal);
}

function showDeleteConfirm(name, onYes) {
    let modal = document.getElementById('dashDeleteConfirmModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'dashDeleteConfirmModal';
    modal.className = 'fixed inset-0 modal-overlay z-[60] p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-xs text-center">
        <p class="text-sm text-[#f5efe6] mb-5 font-[Cinzel]">Delete <strong>${escHtml(name)}</strong>?</p>
        <div class="flex gap-3">
            <button data-yes class="flex-1 btn-danger text-xs py-3 rounded-xl font-bold uppercase">Delete</button>
            <button data-no class="flex-1 btn-secondary text-xs py-3 rounded-xl font-bold uppercase">Cancel</button>
        </div>
    </div>`;

    modal.querySelector('[data-yes]').addEventListener('click', () => { modal.remove(); onYes(); });
    modal.querySelector('[data-no]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function navigateTo(type, rowId, useAutosave = false) {
    sessionStorage.setItem('dh_dashboard_pick', JSON.stringify({ type, id: rowId, autosave: useAutosave }));
    window.location.href = type === 'dm' ? 'dm/' : 'character/';
}

function showNewMenu() {
    let menu = document.getElementById('dashNewMenu');
    if (menu) { menu.classList.toggle('hidden'); return; }

    menu = document.createElement('div');
    menu.id = 'dashNewMenu';
    menu.className = 'fixed inset-0 modal-overlay z-50 p-4 flex items-center justify-center';
    menu.innerHTML = `<div class="modal-panel p-6 w-full max-w-xs">
        <h2 class="font-[Cinzel] text-sm font-bold text-center mb-4" style="color:var(--accent-1)">Create New</h2>
        <div class="space-y-3">
            <button class="option-card" data-new="dm">
                <span class="text-2xl">⚒️</span>
                <div><div class="text-xs font-bold text-[#f5efe6] font-[Cinzel]">Table</div><div class="text-[10px] text-zinc-500">DM Tools — combat, vault, chronicle</div></div>
            </button>
            <button class="option-card" data-new="character">
                <span class="text-2xl">🗡️</span>
                <div><div class="text-xs font-bold text-[#f5efe6] font-[Cinzel]">Character</div><div class="text-[10px] text-zinc-500">Character sheet — stats, cards, gear</div></div>
            </button>
        </div>
        <button class="w-full text-center text-[10px] text-zinc-600 mt-4 hover:text-zinc-400" data-close-new>Cancel</button>
    </div>`;
    menu.addEventListener('click', (e) => { if (e.target === menu) menu.classList.add('hidden'); });
    document.body.appendChild(menu);

    menu.querySelector('[data-new="dm"]').addEventListener('click', () => { menu.classList.add('hidden'); window.location.href = 'dm/'; });
    menu.querySelector('[data-new="character"]').addEventListener('click', () => { menu.classList.add('hidden'); window.location.href = 'character/'; });
    menu.querySelector('[data-close-new]').addEventListener('click', () => menu.classList.add('hidden'));
}

async function loadRows(table, columns) {
    const { data, error } = await supabase
        .from(table)
        .select(`id, updated_at, ${columns}`)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) console.warn('[dashboard] loadRows error:', table, error.message);
    return error ? [] : (data || []);
}
