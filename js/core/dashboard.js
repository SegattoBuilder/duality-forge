import { TABLE_DM_TABLES, TABLE_CHARACTERS, TABLE_PROFILES, LS_THEME, LS_CONSENT } from './constants.js';
import { formatRelativeDate, detectJsonType } from './dashboard-logic.js';
import { escHtml } from './utils.js';
import { initMode, setMode, applyTheme, renderThemePicker } from './theme.js';
import { resetPassword, changeEmail, signOutAll, deleteAccount, showAlert, showConfirm } from './auth.js';

let supabase = null;
let userId = null;
let isEmail = false;
let defaultNickname = 'Forger';

export function initDashboard(sb, uid) {
    supabase = sb;
    userId = uid;
    sb.auth.getSession().then(({ data: { session } }) => {
        isEmail = session?.user?.app_metadata?.provider === 'email';
        defaultNickname = session?.user?.user_metadata?.full_name
            || session?.user?.email?.split('@')[0]
            || 'Forger';
    });
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

    const headerHtml = `<div class="flex items-center justify-between mb-6">
        <button id="dashProfileBtn" class="btn-primary-pill px-4 py-2 text-xs">👤 Profile</button>
        <div class="flex gap-2">
            <button id="dashCommunityBtn" class="btn-primary-pill px-4 py-2 text-xs">🔥 Community</button>
            <button id="dashUploadBtn" class="btn-primary-pill px-4 py-2 text-xs">📤 Upload</button>
            <button id="dashNewBtn" class="btn-primary-pill px-4 py-2 text-xs">+ New</button>
            <div class="relative">
                <button id="dashGearBtn" class="btn-primary-pill px-3 py-2 text-lg leading-none">⚙️</button>
                <div id="gearMenu" class="hidden absolute right-0 top-12 w-52 dropdown-menu z-50">
                    <div class="px-4 py-3 border-b border-[#3d362a]">
                        <div class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2">Display Mode</div>
                        <div class="flex gap-2">
                            <button data-mode="dark" class="mode-btn" title="Dark">🌙</button>
                            <button data-mode="light" class="mode-btn" title="Light">☀️</button>
                            <button data-mode="scifi" class="mode-btn" title="Sci-Fi">🖥️</button>
                            <button data-mode="fantasy" class="mode-btn" title="Fantasy">🐉</button>
                        </div>
                    </div>
                    <div class="px-4 py-3">
                        <div class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2">Accent Color</div>
                        <div id="kebabThemeSwatches" class="grid grid-cols-5 gap-2"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const wireHeader = () => {
        wireNewButton(container);
        wireProfileButton(container);
        wireUploadButton(container);
        wireCommunityButton(container);
        wireGearButton(container);
    };

    // Check if profile exists, show welcome prompt if not
    const { data: existingProfile } = await supabase.from(TABLE_PROFILES).select('id').eq('id', userId).single();
    const needsWelcome = !existingProfile;

    if (!sortedTables.length && !sortedChars.length) {
        container.innerHTML = headerHtml + `<div class="text-center py-8">
            <p class="text-zinc-500 text-sm mb-4">No saves yet. Start forging!</p>
        </div>`;
        wireHeader();
        if (needsWelcome) showWelcomeModal();
        return;
    }

    let html = headerHtml;
    if (sortedTables.length) html += sectionHtml('⚒️ Tables', sortedTables, 'dm', tableMap);
    if (sortedChars.length) html += sectionHtml('🗡️ Characters', sortedChars, 'character', tableMap);

    container.innerHTML = html;
    wireHeader();
    wireCards(container, sortedTables, sortedChars);
    wireCarouselArrows(container);
    if (needsWelcome) showWelcomeModal();
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
    const id = 'carousel-' + type;
    const showArrows = rows.length > 3;
    return `<div class="mb-6">
        <h3 class="font-[Cinzel] text-sm font-bold uppercase tracking-wide text-zinc-500 mb-3">${title}</h3>
        <div class="relative">
            ${showArrows ? `<button data-scroll-left="${id}" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-[#1e1b16] border border-[#4a3f30] text-zinc-400 hover:border-[#d4a017] hover:text-[#d4a017] transition-all flex items-center justify-center text-sm">‹</button>` : ''}
            <div id="${id}" class="flex pb-2" style="gap:0.75rem;overflow:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;max-width:calc(13rem * 3 + 0.75rem * 2)">${cards}</div>
            ${showArrows ? `<button data-scroll-right="${id}" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-[#1e1b16] border border-[#4a3f30] text-zinc-400 hover:border-[#d4a017] hover:text-[#d4a017] transition-all flex items-center justify-center text-sm">›</button>` : ''}
        </div>
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

    return `<button class="dash-card picker-card text-left snap-start p-4 overflow-hidden" style="height:8rem;min-width:13rem;width:13rem;flex:0 0 13rem" data-type="${type}" data-row-id="${row.id}">
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

function wireCarouselArrows(container) {
    container.querySelectorAll('[data-scroll-left]').forEach(btn => {
        btn.addEventListener('click', () => {
            const track = document.getElementById(btn.dataset.scrollLeft);
            if (track) track.scrollBy({ left: -220 });
        });
    });
    container.querySelectorAll('[data-scroll-right]').forEach(btn => {
        btn.addEventListener('click', () => {
            const track = document.getElementById(btn.dataset.scrollRight);
            if (track) track.scrollBy({ left: 220 });
        });
    });
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
                await supabase.from(TABLE_CHARACTERS).update({ table_approved: 'kicked' }).eq('table_id', row.id);
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
        <div class="mt-4 text-center flex justify-center gap-4">
            <button data-reset-pw class="btn-link hidden">🔑 Reset Password</button>
            <button data-change-email class="btn-link hidden">✉️ Change Email</button>
        </div>
        <div id="dpChangeEmailRow" class="hidden mt-3 flex gap-2">
            <input id="dpChangeEmailInput" type="email" placeholder="new@email.com" class="flex-1 input-compact text-left px-3">
            <button data-send-email class="btn-primary text-[10px] px-4 py-2">Send</button>
        </div>
        <div class="mt-2 text-center">
            <button data-signout-all class="btn-link text-red-400/60 hover:text-red-400">🚪 Sign Out All Devices</button>
        </div>
        <div class="mt-2 text-center">
            <button data-delete-account class="btn-link text-red-500/60 hover:text-red-500">🗑️ Delete Account</button>
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
        if (error) { showAlert('Failed to save profile: ' + error.message); return; }
        close();
    });

    // Email-only actions
    const emailUser = isEmail;
    const resetPwBtn = modal.querySelector('[data-reset-pw]');
    const changeEmailBtn = modal.querySelector('[data-change-email]');
    if (emailUser) {
        resetPwBtn.classList.remove('hidden');
        changeEmailBtn.classList.remove('hidden');
    }
    resetPwBtn.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) { resetPassword(user.email); close(); }
    });
    changeEmailBtn.addEventListener('click', () => {
        document.getElementById('dpChangeEmailRow').classList.toggle('hidden');
    });
    modal.querySelector('[data-send-email]').addEventListener('click', () => {
        const val = document.getElementById('dpChangeEmailInput').value.trim();
        if (val) { changeEmail(val); close(); }
    });

    // Sign out all
    modal.querySelector('[data-signout-all]').addEventListener('click', () => {
        showConfirm('Sign out from all devices?', async () => {
            await signOutAll();
            window.location.href = '/';
        });
    });

    // Delete account
    modal.querySelector('[data-delete-account]').addEventListener('click', () => {
        showDeleteAccountModal(async () => {
            const ok = await deleteAccount();
            if (ok) window.location.href = '/';
        });
    });
}

function showDeleteAccountModal(onConfirm) {
    let modal = document.getElementById('dashDeleteAccountModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'dashDeleteAccountModal';
    modal.className = 'fixed inset-0 modal-overlay z-[9999] p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-sm">
        <div class="border-b border-[#363026] pb-3 mb-5"><h2 class="font-black text-base uppercase font-[Cinzel] tracking-wide text-red-500">Delete Account</h2></div>
        <div class="space-y-4">
            <p class="text-xs text-zinc-400">This will <span class="text-red-400 font-bold">permanently delete</span> your account, all characters, campaigns, and profile data. This action cannot be undone.</p>
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Type <span class="text-red-500">DELETE</span> to confirm</label><input data-confirm-input type="text" placeholder="DELETE" class="w-full input-field text-center font-mono uppercase" autocomplete="off"></div>
            <div class="flex gap-3">
                <button data-confirm-btn disabled class="flex-1 bg-red-600 text-xs py-3 rounded-xl font-bold uppercase text-white opacity-40 cursor-not-allowed">Delete Forever</button>
                <button data-confirm-cancel class="flex-1 btn-secondary text-xs py-3 rounded-xl font-bold uppercase">Cancel</button>
            </div>
        </div>
    </div>`;
    const input = modal.querySelector('[data-confirm-input]');
    const btn = modal.querySelector('[data-confirm-btn]');
    input.oninput = () => {
        const ok = input.value.trim().toUpperCase() === 'DELETE';
        btn.disabled = !ok;
        btn.classList.toggle('opacity-40', !ok);
        btn.classList.toggle('cursor-not-allowed', !ok);
    };
    btn.addEventListener('click', () => { modal.remove(); onConfirm(); });
    modal.querySelector('[data-confirm-cancel]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function showWelcomeModal() {
    let modal = document.getElementById('dashWelcomeModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'dashWelcomeModal';
    modal.className = 'fixed inset-0 modal-overlay z-50 p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-sm">
        <div class="text-center mb-5">
            <div class="text-3xl mb-2">🔥</div>
            <h2 class="font-black text-base uppercase font-[Cinzel] tracking-wide" style="color:var(--accent-1)">Welcome to the Forge!</h2>
        </div>
        <div class="space-y-4">
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Nickname</label><input data-nickname type="text" maxlength="30" class="w-full input-field" value="${escHtml(defaultNickname)}"></div>
            <div class="text-[10px] text-zinc-500 text-center">You can change this later in your profile.</div>
        </div>
        <div class="flex gap-3 mt-6">
            <button data-save class="flex-1 btn-primary">Let's Go!</button>
            <button data-dismiss class="flex-1 btn-secondary">Skip</button>
        </div>
        <div class="text-[10px] text-zinc-600 text-center mt-3">Skip will use <strong>${escHtml(defaultNickname)}</strong> as your nickname.</div>
    </div>`;
    document.body.appendChild(modal);

    const save = async (nickname) => {
        await supabase.from(TABLE_PROFILES).upsert({ id: userId, nickname });
        modal.remove();
    };
    modal.querySelector('[data-save]').addEventListener('click', () => {
        const val = modal.querySelector('[data-nickname]').value.trim() || defaultNickname;
        save(val);
    });
    modal.querySelector('[data-dismiss]').addEventListener('click', () => save(defaultNickname));
    modal.querySelector('[data-nickname]').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = modal.querySelector('[data-nickname]').value.trim() || defaultNickname;
            save(val);
        }
    });
}

function wireCommunityButton(container) {
    const btn = container.querySelector('#dashCommunityBtn');
    if (!btn) return;
    btn.addEventListener('click', () => { window.location.href = 'community/'; });
}

let gearMenuHandler = null;

function wireGearButton(container) {
    const btn = container.querySelector('#dashGearBtn');
    const menu = container.querySelector('#gearMenu');
    if (!btn || !menu) return;

    initMode();
    renderThemePicker();
    applyTheme(localStorage.getItem(LS_THEME) || 'gold');

    menu.querySelectorAll('[data-mode]').forEach(b => {
        b.addEventListener('click', (e) => { e.stopPropagation(); setMode(b.dataset.mode); });
    });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasHidden = menu.classList.contains('hidden');
        menu.classList.toggle('hidden');
        if (gearMenuHandler) { document.removeEventListener('click', gearMenuHandler); gearMenuHandler = null; }
        if (wasHidden) {
            gearMenuHandler = (ev) => {
                if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', gearMenuHandler);
                    gearMenuHandler = null;
                }
            };
            setTimeout(() => document.addEventListener('click', gearMenuHandler), 0);
        }
    });
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
    const close = () => menu.classList.add('hidden');
    menu.addEventListener('click', (e) => { if (e.target === menu) close(); });
    menu.querySelector('[data-close-new]').addEventListener('click', close);
    menu.querySelector('[data-new="dm"]').addEventListener('click', () => { close(); showNewNamePrompt('dm'); });
    menu.querySelector('[data-new="character"]').addEventListener('click', () => { close(); showNewNamePrompt('character'); });
    document.body.appendChild(menu);
}

function showNewNamePrompt(type) {
    const isDm = type === 'dm';
    const label = isDm ? 'Campaign Name' : 'Character Name';
    const placeholder = isDm ? 'e.g. Curse of the Crimson Throne' : 'e.g. Thorn Ironveil';
    const icon = isDm ? '⚒️' : '🗡️';

    let modal = document.getElementById('dashNewNameModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'dashNewNameModal';
    modal.className = 'fixed inset-0 modal-overlay z-50 p-4 flex items-center justify-center';
    modal.innerHTML = `<div class="modal-panel p-6 w-full max-w-xs">
        <div class="text-center mb-4"><span class="text-2xl">${icon}</span></div>
        <div class="mb-4"><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">${label}</label>
        <input data-name type="text" placeholder="${placeholder}" maxlength="60" class="w-full input-field text-center"></div>
        <div class="flex gap-3">
            <button data-create class="flex-1 btn-primary">Create</button>
            <button data-cancel class="flex-1 btn-secondary">Cancel</button>
        </div>
    </div>`;

    const close = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('[data-cancel]').addEventListener('click', close);

    const create = async () => {
        const name = modal.querySelector('[data-name]').value.trim();
        if (!name) { modal.querySelector('[data-name]').focus(); return; }
        const table = isDm ? TABLE_DM_TABLES : TABLE_CHARACTERS;
        const nameCol = isDm ? 'campaign_name' : 'character_name';
        const { data: row, error } = await supabase.from(table)
            .insert({ user_id: userId, [nameCol]: name })
            .select('id').single();
        if (error) { showAlert('Failed to create: ' + error.message); return; }
        close();
        navigateTo(type, row.id);
    };

    modal.querySelector('[data-create]').addEventListener('click', create);
    modal.querySelector('[data-name]').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
    document.body.appendChild(modal);
    modal.querySelector('[data-name]').focus();
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
