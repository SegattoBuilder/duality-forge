import { TABLE_DM_TABLES, TABLE_CHARACTERS, TABLE_PROFILES } from './constants.js';
import { formatRelativeDate, detectJsonType } from './dashboard-logic.js';
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
        loadRows(TABLE_DM_TABLES, 'campaign_name, data, autosave_data, autosave_at'),
        loadRows(TABLE_CHARACTERS, 'character_name, table_id, data, autosave_data, autosave_at')
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
        <button id="dashProfileBtn" class="btn-primary-pill px-4 py-2">👤 Profile</button>
        <div class="flex gap-2">
            <button id="dashCommunityBtn" class="btn-primary-pill px-4 py-2">🔥 Fireside</button>
            <button id="dashUploadBtn" class="btn-primary-pill px-4 py-2">⬆ Upload</button>
            <button id="dashNewBtn" class="btn-primary-pill px-4 py-2">+ New</button>
        </div>
    </div>`;

    if (sortedTables.length) html += sectionHtml('⚒️ Tables', sortedTables, 'dm', tableMap);
    if (sortedChars.length) html += sectionHtml('🗡️ Characters', sortedChars, 'character', tableMap);

    container.innerHTML = html;
    wireNewButton(container);
    wireProfileButton(container);
    wireUploadButton(container);
    wireCommunityButton(container);
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
        <h3 class="font-[Cinzel] text-sm font-bold uppercase tracking-wide text-zinc-500 mb-3">${title}</h3>
        <div class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory" style="scrollbar-width:thin;scrollbar-color:#3d362a transparent">${cards}</div>
    </div>`;
}

function cardHtml(row, type, tableMap) {
    const name = row.campaign_name || row.character_name || 'Unnamed';
    const date = row.updated_at ? formatRelativeDate(row.updated_at) : '';
    const icon = type === 'dm' ? '⚒️' : '🗡️';
    const hasAutosave = row.autosave_data && row.autosave_at;
    const badge = hasAutosave ? '<span class="text-[10px] text-zinc-600">2 saves</span>' : '';

    let previewHtml = '';
    if (type === 'character' && row.data?.fields) {
        const f = row.data.fields;
        const pills = [f.charClass, f.charLevel ? `Lv ${f.charLevel}` : ''].filter(Boolean)
            .map(t => `<span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-2 py-0.5 text-zinc-400">${escHtml(t)}</span>`).join('');
        if (pills) previewHtml = `<div class="flex flex-wrap gap-1 mt-2">${pills}</div>`;
    } else if (type === 'dm' && row.data) {
        const d = row.data;
        const pills = [
            d.creatures?.length ? `${d.creatures.length} ⚔` : '',
            d.vaultCreatures?.length ? `${d.vaultCreatures.length} 📦` : '',
            d.chronicleEntries?.length ? `${d.chronicleEntries.length} 📜` : ''
        ].filter(Boolean)
            .map(t => `<span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-2 py-0.5 text-zinc-400">${t}</span>`).join('');
        if (pills) previewHtml = `<div class="flex flex-wrap gap-1 mt-2">${pills}</div>`;
    }

    let linkedHtml = '';
    if (type === 'character' && row.table_id && tableMap[row.table_id]) {
        linkedHtml = `<div class="text-[10px] text-zinc-500 truncate mt-1">🔗 ${escHtml(tableMap[row.table_id])}</div>`;
    }

    return `<button class="dash-card picker-card text-left flex-shrink-0 w-52 snap-start p-4" data-type="${type}" data-row-id="${row.id}">
        <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">${icon}</span>
            <span class="text-base font-bold text-[#f5efe6] font-[Cinzel] truncate">${escHtml(name)}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
            <span class="text-sm text-zinc-500">${date}</span>
            ${badge}
        </div>
        ${previewHtml}
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

function wireProfileButton(container) {
    const btn = container.querySelector('#dashProfileBtn');
    if (!btn) return;
    btn.addEventListener('click', () => showProfileModal());
}

async function showProfileModal() {
    let modal = document.getElementById('dashProfileModal');
    if (modal) modal.remove();

    const { data: profile } = await supabase.from(TABLE_PROFILES).select('*').eq('id', userId).single();
    const p = profile || {};

    modal = document.createElement('div');
    modal.id = 'dashProfileModal';
    modal.className = 'fixed inset-0 modal-overlay z-50 p-4 overflow-y-auto flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-sm">
        <div class="flex justify-between items-center border-b border-[#363026] pb-3 mb-5">
            <h2 class="font-black text-base uppercase font-[Cinzel] tracking-wide" style="color:var(--accent-1)">Profile</h2>
            <button data-close class="btn-close">✕</button>
        </div>
        <div class="space-y-4">
            <div class="flex justify-center"><div id="dpAvatarPreview" class="w-20 h-20 rounded-full border-2 border-[#d4a017] bg-[#2a2418] flex items-center justify-center text-3xl overflow-hidden">🎲</div></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Avatar URL</label><input id="dpAvatar" type="url" placeholder="https://example.com/avatar.png" class="w-full input-field" value="${escHtml(p.avatar_url || '')}"></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Nickname</label><input id="dpNickname" type="text" placeholder="How should we call you?" maxlength="30" class="w-full input-field" value="${escHtml(p.nickname || '')}"></div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Country</label><input id="dpCountry" type="text" placeholder="e.g. Canada" maxlength="50" class="w-full input-field" value="${escHtml(p.country || '')}"></div>
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">State / Province</label><input id="dpState" type="text" placeholder="e.g. Alberta" maxlength="50" class="w-full input-field" value="${escHtml(p.state || '')}"></div>
            </div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Age Range</label><select id="dpAge" class="w-full select-field">
                <option value="">Select...</option><option value="under-18">Under 18</option><option value="18-24">18–24</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-54">45–54</option><option value="55+">55+</option>
            </select></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">DM Experience</label><select id="dpDmExp" class="w-full select-field">
                <option value="">Select...</option><option value="none">Never</option><option value="<1">Less than 1 year</option><option value="1-2">1–2 years</option><option value="3-5">3–5 years</option><option value="5-10">5–10 years</option><option value="10+">10+ years</option>
            </select></div>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Player Experience</label><select id="dpPlayerExp" class="w-full select-field">
                <option value="">Select...</option><option value="none">Never</option><option value="<1">Less than 1 year</option><option value="1-2">1–2 years</option><option value="3-5">3–5 years</option><option value="5-10">5–10 years</option><option value="10+">10+ years</option>
            </select></div>
        </div>
        <div class="flex gap-3 mt-6">
            <button data-save class="flex-1 btn-primary">Save</button>
            <button data-cancel class="flex-1 btn-secondary">Cancel</button>
        </div>
    </div>`;

    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.querySelector('[data-cancel]').addEventListener('click', close);

    // Set select values after DOM insertion
    document.body.appendChild(modal);
    if (p.age) document.getElementById('dpAge').value = p.age;
    if (p.dm_experience) document.getElementById('dpDmExp').value = p.dm_experience;
    if (p.player_experience) document.getElementById('dpPlayerExp').value = p.player_experience;

    // Avatar preview
    const previewEl = document.getElementById('dpAvatarPreview');
    const avatarInput = document.getElementById('dpAvatar');
    const updatePreview = () => {
        const url = avatarInput.value.trim();
        if (url && url.match(/^https?:\/\//)) previewEl.innerHTML = `<img src="${escHtml(url)}" alt="" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='🎲'">`;
        else previewEl.innerHTML = '🎲';
    };
    avatarInput.addEventListener('input', updatePreview);
    updatePreview();

    // Save
    modal.querySelector('[data-save]').addEventListener('click', async () => {
        const row = {
            id: userId,
            nickname: document.getElementById('dpNickname').value.trim() || null,
            avatar_url: avatarInput.value.trim() || null,
            country: document.getElementById('dpCountry').value.trim() || null,
            state: document.getElementById('dpState').value.trim() || null,
            age: document.getElementById('dpAge').value || null,
            dm_experience: document.getElementById('dpDmExp').value || null,
            player_experience: document.getElementById('dpPlayerExp').value || null
        };
        const { error } = await supabase.from(TABLE_PROFILES).upsert(row);
        if (error) { alert('Failed to save profile: ' + error.message); return; }
        close();
    });
}

function wireCommunityButton(container) {
    const btn = container.querySelector('#dashCommunityBtn');
    if (!btn) return;
    btn.addEventListener('click', () => { window.location.href = 'community/'; });
}

function wireUploadButton(container) {
    const btn = container.querySelector('#dashUploadBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const data = json.data || json;
                const type = detectJsonType(data);
                if (!type) { showUploadAlert('Could not detect file type. Expected a character or table JSON.'); return; }
                if (type === 'character') {
                    const name = data.fields?.charName?.trim() || file.name.replace('.json', '');
                    const { error } = await supabase.from(TABLE_CHARACTERS)
                        .insert({ user_id: userId, character_name: name, data });
                    if (error) { showUploadAlert('Upload failed: ' + error.message); return; }
                } else {
                    const name = data.campaign || file.name.replace('.json', '');
                    const { error } = await supabase.from(TABLE_DM_TABLES)
                        .insert({ user_id: userId, campaign_name: name, data });
                    if (error) { showUploadAlert('Upload failed: ' + error.message); return; }
                }
                renderDashboard(container);
            } catch { showUploadAlert('Invalid JSON file.'); }
        });
        input.click();
    });
}

function showUploadAlert(msg) {
    let modal = document.getElementById('dashUploadAlert');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'dashUploadAlert';
    modal.className = 'fixed inset-0 modal-overlay z-[60] p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-xs text-center">
        <p class="text-sm text-[#f5efe6] mb-5 font-[Cinzel]">${escHtml(msg)}</p>
        <button data-ok class="w-full btn-primary text-xs py-3 rounded-xl font-bold uppercase">OK</button>
    </div>`;
    modal.querySelector('[data-ok]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
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

    menu.querySelector('[data-new="dm"]').addEventListener('click', () => {
        menu.classList.add('hidden');
        sessionStorage.setItem('dh_dashboard_new', 'dm');
        window.location.href = 'dm/';
    });
    menu.querySelector('[data-new="character"]').addEventListener('click', () => {
        menu.classList.add('hidden');
        sessionStorage.setItem('dh_dashboard_new', 'character');
        window.location.href = 'character/';
    });
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
