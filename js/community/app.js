import SUPABASE_CONFIG from '../core/config.js';
import { TABLE_COMMUNITY_CHAPTERS, TABLE_COMMUNITY_RATINGS, TABLE_COMMUNITY_IMPORTS, LS_THEME } from '../core/constants.js';
import { initMode, applyTheme } from '../core/theme.js';

const sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
let chapters = [];
let myShares = [];
let userImports = {};
let userRatings = {};
let currentUser = null;
let activeTab = 'browse';
let editingId = null;
let editQuill = null;
let editNpcs = [];
let editMusic = [];

const QUILL_TOOLBAR = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'link'],
    ['clean']
];

// ========== AUTH ==========
async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { currentUser = session.user; renderAuthBtn(); await loadUserData(); }
    sb.auth.onAuthStateChange((_, session) => {
        currentUser = session?.user || null;
        renderAuthBtn();
        if (currentUser) loadUserData();
    });
}

function renderAuthBtn() {
    const btn = document.getElementById('authBtn');
    if (currentUser) {
        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        const avatar = currentUser.user_metadata?.picture || '';
        btn.innerHTML = avatar
            ? `<img src="${esc(avatar)}" alt="" class="w-10 h-10 rounded-full border-2 object-cover" style="border-color:var(--accent-1)">`
            : `<span class="w-10 h-10 rounded-full border-2 bg-[#2a2418] flex items-center justify-center text-sm font-bold" style="border-color:var(--accent-1);color:var(--accent-1)">${esc(name.charAt(0).toUpperCase())}</span>`;
        btn.onclick = null;
        btn.className = 'h-10 w-10 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-default';
    } else {
        btn.innerHTML = '<span class="text-[10px] text-zinc-400">Sign In</span>';
        btn.onclick = openAuthModal;
        btn.className = 'btn-nav px-3 w-auto cursor-pointer';
    }
}

// ========== TABS ==========
function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tabBrowse').classList.toggle('active', tab === 'browse');
    document.getElementById('tabMyShares').classList.toggle('active', tab === 'myshares');
    // Show/hide browse filters
    const filters = document.querySelector('.space-y-3.mb-6');
    filters.style.display = tab === 'browse' ? '' : 'none';
    if (tab === 'myshares') {
        if (!currentUser) { openAuthModal(); switchTab('browse'); return; }
        loadMyShares();
    } else {
        renderResults();
    }
}

async function loadUserData() {
    if (!currentUser) return;
    const [{ data: imports }, { data: ratings }] = await Promise.all([
        sb.from(TABLE_COMMUNITY_IMPORTS).select('chapter_id, imported_version').eq('user_id', currentUser.id),
        sb.from(TABLE_COMMUNITY_RATINGS).select('chapter_id, rating').eq('user_id', currentUser.id)
    ]);
    userImports = {};
    (imports || []).forEach(r => userImports[r.chapter_id] = r.imported_version);
    userRatings = {};
    (ratings || []).forEach(r => userRatings[r.chapter_id] = r.rating);
    renderResults();
}

// ========== LOAD CHAPTERS ==========
async function loadChapters() {
    const { data, error } = await sb.from(TABLE_COMMUNITY_CHAPTERS)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { document.getElementById('communityStatus').textContent = 'Failed to load chapters.'; return; }
    chapters = data || [];
    renderResults();
}

async function loadMyShares() {
    if (!currentUser) return;
    const status = document.getElementById('communityStatus');
    const grid = document.getElementById('communityResults');
    status.textContent = 'Loading your shares...';
    status.classList.remove('hidden');
    grid.innerHTML = '';
    const { data, error } = await sb.from(TABLE_COMMUNITY_CHAPTERS)
        .select('*')
        .eq('author_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (error) { status.textContent = 'Failed to load your shares.'; return; }
    myShares = data || [];
    renderMyShares();
}

// ========== FILTER & RENDER ==========
function getFiltered() {
    let filtered = [...chapters];
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const env = document.getElementById('filterEnv').value;
    const diff = document.getElementById('filterDiff').value;
    const dur = document.getElementById('filterDuration').value;
    const sort = document.getElementById('sortBy').value;

    if (search) filtered = filtered.filter(c => c.title.toLowerCase().includes(search) || (c.author_nickname || '').toLowerCase().includes(search) || (c.description || '').toLowerCase().includes(search));
    if (env) filtered = filtered.filter(c => c.environment === env);
    if (diff) filtered = filtered.filter(c => c.difficulty === diff);
    if (dur) filtered = filtered.filter(c => c.duration === dur);

    if (sort === 'rating') filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (sort === 'popular') filtered.sort((a, b) => (b.import_count || 0) - (a.import_count || 0));

    return filtered;
}

function renderResults() {
    if (activeTab === 'myshares') { renderMyShares(); return; }
    const filtered = getFiltered();
    const status = document.getElementById('communityStatus');
    const grid = document.getElementById('communityResults');

    if (filtered.length === 0) {
        status.textContent = chapters.length ? 'No chapters match your filters.' : 'No shared chapters yet. Be the first to share!';
        status.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }
    status.classList.add('hidden');
    grid.innerHTML = filtered.map(ch => {
        const stars = renderStars(ch.avg_rating || 0);
        return `<div class="compendium-card cat-domain-cards cursor-pointer" onclick="openPreview('${ch.id}')">
            <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(ch.title)}</h3>
            </div>
            ${ch.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(ch.description)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 mb-3">
                ${ch.environment ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.environment}</span>` : ''}
                ${ch.difficulty ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.difficulty}</span>` : ''}
                ${ch.duration ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.duration}</span>` : ''}
                <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Lv ${ch.level_min}–${ch.level_max}</span>
                <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.party_size_min}–${ch.party_size_max} players</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-600">
                <span>by ${esc(ch.author_nickname || 'Unknown')}</span>
                <div class="flex items-center gap-2">
                    <span>${stars} (${ch.rating_count || 0})</span>
                    <span>📥 ${ch.import_count || 0}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderMyShares() {
    const status = document.getElementById('communityStatus');
    const grid = document.getElementById('communityResults');
    if (myShares.length === 0) {
        status.textContent = 'You haven\'t shared any chapters yet. Share from DM Tools → Chronicle.';
        status.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }
    status.classList.add('hidden');
    grid.innerHTML = myShares.map(ch => {
        const stars = renderStars(ch.avg_rating || 0);
        const updated = ch.updated_at && ch.updated_at !== ch.created_at ? `Updated ${new Date(ch.updated_at).toLocaleDateString()}` : '';
        return `<div class="compendium-card cat-domain-cards">
            <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(ch.title)}</h3>
            </div>
            ${ch.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(ch.description)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 mb-3">
                ${ch.environment ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.environment}</span>` : ''}
                ${ch.difficulty ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.difficulty}</span>` : ''}
                ${ch.duration ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.duration}</span>` : ''}
                <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Lv ${ch.level_min}–${ch.level_max}</span>
                <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.party_size_min}–${ch.party_size_max} players</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-600 mb-3">
                <span>${stars} (${ch.rating_count || 0}) · 📥 ${ch.import_count || 0}</span>
                ${updated ? `<span>${updated}</span>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick="openEdit('${ch.id}')" class="flex-1 btn-outline text-[10px]">✏️ Edit</button>
                <button onclick="deleteShare('${ch.id}')" class="btn-outline text-[10px] text-red-400 border-red-900/50 hover:border-red-500 hover:text-red-300">🗑</button>
            </div>
        </div>`;
    }).join('');
}

function renderStars(avg) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= Math.round(avg) ? '★' : '☆';
    return `<span class="text-[#d4a017]">${s}</span>`;
}

function renderInteractiveStars(chapterId, current) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= current;
        s += `<span class="cursor-pointer text-lg ${filled ? 'text-[#d4a017]' : 'text-zinc-600'} hover:text-[#d4a017] transition-colors" onclick="event.stopPropagation(); rateChapter('${chapterId}', ${i})">${filled ? '★' : '☆'}</span>`;
    }
    return s;
}

// ========== PREVIEW ==========
let previewChapter = null;

function openPreview(id) {
    const ch = chapters.find(c => c.id === id);
    if (!ch) return;
    previewChapter = ch;
    const content = ch.content || {};
    const myRating = userRatings[ch.id] || 0;

    let html = `<div class="space-y-5">
        <div>
            <h2 class="font-[Cinzel] text-lg font-black text-[#f5efe6] mb-1">${esc(ch.title)}</h2>
            <div class="text-[10px] text-zinc-500">by ${esc(ch.author_nickname || 'Unknown')} · v${ch.version} · ${new Date(ch.created_at).toLocaleDateString()}</div>
        </div>
        <div class="flex flex-wrap gap-1.5">
            ${ch.environment ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.environment}</span>` : ''}
            ${ch.difficulty ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.difficulty}</span>` : ''}
            ${ch.duration ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.duration}</span>` : ''}
            <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Lv ${ch.level_min}–${ch.level_max}</span>
            <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${ch.party_size_min}–${ch.party_size_max} players</span>
        </div>
        ${ch.description ? `<p class="text-xs text-zinc-400 italic">${esc(ch.description)}</p>` : ''}
        <div class="border-t border-[#3d362a] pt-4">
            <div class="prose-dark text-sm text-[#e8e0d4] leading-relaxed">${content.text || '<span class="text-zinc-600 italic">No content</span>'}</div>
        </div>`;

    if (content.npcs?.length) {
        html += `<div class="border-t border-[#3d362a] pt-4"><div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">🧑 NPCs & Factions</div><div class="space-y-1">`;
        content.npcs.forEach(npc => {
            html += `<div class="text-xs text-zinc-400"><span class="text-[#f5efe6] font-bold">${esc(npc.name || 'Unnamed')}</span>`;
            if (npc.faction) html += ` · ${esc(npc.faction)}`;
            if (npc.disposition) html += ` · <span class="${npc.disposition === 'Friendly' ? 'text-green-400' : npc.disposition === 'Hostile' ? 'text-red-400' : 'text-amber-400'}">${npc.disposition}</span>`;
            if (npc.notes) html += ` — ${esc(npc.notes)}`;
            html += `</div>`;
        });
        html += `</div></div>`;
    }

    if (content.music?.length) {
        html += `<div class="border-t border-[#3d362a] pt-4"><div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">🎵 Music Cues</div><div class="space-y-1">`;
        content.music.forEach(m => {
            const isLink = m.cue && m.cue.match(/^https?:\/\//);
            html += `<div class="text-xs text-zinc-400"><span class="text-[#f5efe6]">${esc(m.scene || 'Scene')}</span> — ${isLink ? `<a href="${esc(m.cue)}" target="_blank" rel="noopener" class="text-[#d4a017] hover:underline">🔗 Link</a>` : esc(m.cue || '')}</div>`;
        });
        html += `</div></div>`;
    }

    // Rating
    html += `<div class="border-t border-[#3d362a] pt-4 flex items-center justify-between">
        <div><span class="text-[10px] text-zinc-500 uppercase font-bold">Your Rating:</span> <span id="previewStars">${renderInteractiveStars(ch.id, myRating)}</span></div>
        <div class="text-[10px] text-zinc-500">${renderStars(ch.avg_rating || 0)} (${ch.rating_count || 0} ratings) · 📥 ${ch.import_count || 0}</div>
    </div>`;

    // Import button
    html += `<div class="flex gap-3"><button onclick="importChapter('${ch.id}')" class="flex-1 btn-primary">Import to Chronicle</button></div></div>`;

    document.getElementById('previewContent').innerHTML = html;
    document.getElementById('previewModal').classList.remove('hidden');
}

function closePreview() {
    document.getElementById('previewModal').classList.add('hidden');
    previewChapter = null;
}

// ========== EDIT / UPDATE / DELETE ==========
function openEdit(id) {
    const ch = myShares.find(c => c.id === id);
    if (!ch) return;
    editingId = id;
    const content = ch.content || {};
    editNpcs = JSON.parse(JSON.stringify(content.npcs || []));
    editMusic = JSON.parse(JSON.stringify(content.music || []));
    document.getElementById('editTitle').value = ch.title || '';
    document.getElementById('editDescription').value = ch.description || '';
    document.getElementById('editLevelMin').value = ch.level_min || 1;
    document.getElementById('editLevelMax').value = ch.level_max || 5;
    document.getElementById('editPartyMin').value = ch.party_size_min || 3;
    document.getElementById('editPartyMax').value = ch.party_size_max || 5;
    document.getElementById('editEnvironment').value = ch.environment || '';
    document.getElementById('editDifficulty').value = ch.difficulty || '';
    document.getElementById('editDuration').value = ch.duration || '';
    document.getElementById('editModal').classList.remove('hidden');
    renderEditNpcs();
    renderEditMusic();
    // Init Quill after modal is visible
    setTimeout(() => {
        const wrap = document.getElementById('editEditorWrap');
        wrap.innerHTML = '';
        editQuill = new Quill(wrap, { theme: 'snow', placeholder: 'Chapter content...', modules: { toolbar: QUILL_TOOLBAR } });
        if (content.text) editQuill.root.innerHTML = content.text;
    }, 50);
}

function closeEdit() {
    document.getElementById('editModal').classList.add('hidden');
    editingId = null;
    if (editQuill) { editQuill = null; document.getElementById('editEditorWrap').innerHTML = ''; }
}

function renderEditNpcs() {
    const el = document.getElementById('editNpcList');
    if (!editNpcs.length) { el.innerHTML = '<div class="text-[10px] text-zinc-600 italic">No NPCs</div>'; return; }
    el.innerHTML = editNpcs.map((npc, i) => `<div class="flex gap-1.5 items-center">
        <input value="${esc(npc.name)}" onchange="updateEditNpc(${i},'name',this.value)" placeholder="Name" class="input-compact text-left px-2 flex-1">
        <input value="${esc(npc.faction)}" onchange="updateEditNpc(${i},'faction',this.value)" placeholder="Faction" class="input-compact text-left px-2 flex-1">
        <select onchange="updateEditNpc(${i},'disposition',this.value)" class="input-compact cursor-pointer">
            <option value=""${!npc.disposition?' selected':''}>--</option>
            <option value="Friendly"${npc.disposition==='Friendly'?' selected':''}>Friendly</option>
            <option value="Neutral"${npc.disposition==='Neutral'?' selected':''}>Neutral</option>
            <option value="Hostile"${npc.disposition==='Hostile'?' selected':''}>Hostile</option>
        </select>
        <input value="${esc(npc.notes)}" onchange="updateEditNpc(${i},'notes',this.value)" placeholder="Notes" class="input-compact text-left px-2 flex-1">
        <button onclick="removeEditNpc(${i})" class="btn-remove text-xs">✕</button>
    </div>`).join('');
}

function renderEditMusic() {
    const el = document.getElementById('editMusicList');
    if (!editMusic.length) { el.innerHTML = '<div class="text-[10px] text-zinc-600 italic">No music cues</div>'; return; }
    el.innerHTML = editMusic.map((m, i) => `<div class="flex gap-1.5 items-center">
        <input value="${esc(m.scene)}" onchange="updateEditMusic(${i},'scene',this.value)" placeholder="Scene" class="input-compact text-left px-2 flex-1">
        <input value="${esc(m.cue)}" onchange="updateEditMusic(${i},'cue',this.value)" placeholder="Link or text" class="input-compact text-left px-2 flex-1">
        <button onclick="removeEditMusic(${i})" class="btn-remove text-xs">✕</button>
    </div>`).join('');
}

function addEditNpc() { editNpcs.push({ name: '', faction: '', disposition: '', notes: '' }); renderEditNpcs(); }
function removeEditNpc(i) { editNpcs.splice(i, 1); renderEditNpcs(); }
function updateEditNpc(i, field, val) { if (editNpcs[i]) editNpcs[i][field] = val; }
function addEditMusic() { editMusic.push({ scene: '', cue: '' }); renderEditMusic(); }
function removeEditMusic(i) { editMusic.splice(i, 1); renderEditMusic(); }
function updateEditMusic(i, field, val) { if (editMusic[i]) editMusic[i][field] = val; }

async function saveEdit() {
    if (!editingId || !currentUser) return;
    const ch = myShares.find(c => c.id === editingId);
    if (!ch) return;
    const title = document.getElementById('editTitle').value.trim();
    if (!title) { alert('Title is required.'); return; }
    const newText = editQuill ? editQuill.root.innerHTML : (ch.content?.text || '');
    const oldContent = ch.content || {};
    const contentChanged = newText !== (oldContent.text || '') || JSON.stringify(editNpcs) !== JSON.stringify(oldContent.npcs || []) || JSON.stringify(editMusic) !== JSON.stringify(oldContent.music || []);
    const updates = {
        title,
        description: document.getElementById('editDescription').value.trim() || null,
        level_min: parseInt(document.getElementById('editLevelMin').value) || 1,
        level_max: parseInt(document.getElementById('editLevelMax').value) || 5,
        party_size_min: parseInt(document.getElementById('editPartyMin').value) || 3,
        party_size_max: parseInt(document.getElementById('editPartyMax').value) || 5,
        environment: document.getElementById('editEnvironment').value || null,
        difficulty: document.getElementById('editDifficulty').value || null,
        duration: document.getElementById('editDuration').value || null,
        content: { text: newText, npcs: editNpcs, music: editMusic },
        updated_at: new Date().toISOString()
    };
    if (contentChanged) updates.version = (ch.version || 1) + 1;
    const { error } = await sb.from(TABLE_COMMUNITY_CHAPTERS).update(updates).eq('id', editingId).eq('author_id', currentUser.id);
    if (error) { alert('Save failed: ' + error.message); return; }
    closeEdit();
    await loadMyShares();
    loadChapters();
}

async function deleteShare(id) {
    if (!confirm('Remove this chapter from the community? This cannot be undone.')) return;
    const { error } = await sb.from(TABLE_COMMUNITY_CHAPTERS).delete().eq('id', id).eq('author_id', currentUser.id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    myShares = myShares.filter(c => c.id !== id);
    renderMyShares();
    loadChapters();
}

// ========== IMPORT ==========
async function importChapter(id) {
    if (!currentUser) { openAuthModal(); return; }
    const ch = chapters.find(c => c.id === id);
    if (!ch) return;

    // Track import
    const { error: importErr } = await sb.from(TABLE_COMMUNITY_IMPORTS).upsert({
        chapter_id: id,
        user_id: currentUser.id,
        imported_version: ch.version
    }, { onConflict: 'chapter_id,user_id' });
    if (importErr) { alert('Import failed: ' + importErr.message); return; }

    // Increment import count
    await sb.from(TABLE_COMMUNITY_CHAPTERS).update({ import_count: (ch.import_count || 0) + 1 }).eq('id', id);
    ch.import_count = (ch.import_count || 0) + 1;

    userImports[id] = ch.version;
    closePreview();
    renderResults();
    showToast('Chapter imported! Open DM Tools \u2192 Chronicle to find it.');

    // Store in localStorage — always creates a new entry
    try {
        const key = 'dh_dm_chronicle';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const content = ch.content || {};
        const title = ch.version > 1 ? ch.title + ' (v' + ch.version + ')' : ch.title;
        existing.unshift({
            id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            title,
            text: content.text || '',
            npcs: content.npcs || [],
            music: content.music || [],
            open: false,
            _imported: { community_id: ch.id, version: ch.version }
        });
        localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
}

// ========== RATE ==========
async function rateChapter(id, rating) {
    if (!currentUser) { openAuthModal(); return; }
    const { error } = await sb.from(TABLE_COMMUNITY_RATINGS).upsert({
        chapter_id: id,
        user_id: currentUser.id,
        rating
    }, { onConflict: 'chapter_id,user_id' });
    if (error) { alert('Rating failed: ' + error.message); return; }
    userRatings[id] = rating;

    // Refresh chapter rating from DB
    const { data } = await sb.from(TABLE_COMMUNITY_CHAPTERS).select('avg_rating, rating_count').eq('id', id).single();
    if (data) {
        const ch = chapters.find(c => c.id === id);
        if (ch) { ch.avg_rating = data.avg_rating; ch.rating_count = data.rating_count; }
    }

    // Update preview stars if open
    const starsEl = document.getElementById('previewStars');
    if (starsEl) starsEl.innerHTML = renderInteractiveStars(id, rating);
    renderResults();
}

// ========== AUTH MODAL ==========
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

async function doSignIn() {
    const email = document.getElementById('authEmail').value.trim();
    const pw = document.getElementById('authPassword').value;
    if (!email || !pw) { alert('Please enter email and password.'); return; }
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) alert('Sign-in failed: ' + error.message);
    else closeAuthModal();
}

async function doSignUp() {
    const email = document.getElementById('authEmail').value.trim();
    const pw = document.getElementById('authPassword').value;
    if (!email || !pw) { alert('Please enter email and password.'); return; }
    if (pw.length < 6) { alert('Password must be at least 6 characters.'); return; }
    const { error } = await sb.auth.signUp({ email, password: pw });
    if (error) alert('Sign-up failed: ' + error.message);
    else alert('Check your email for a confirmation link!');
}

async function signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert('Google sign-in failed: ' + error.message);
}

// ========== UTILS ==========
function esc(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1e1b16] border border-[#3d362a] text-[#f5efe6] text-xs px-5 py-3 rounded-lg shadow-lg z-[999] font-[Cinzel] tracking-wide transition-opacity duration-300';
    el.style.borderColor = 'var(--accent-1)';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterEnv').value = '';
    document.getElementById('filterDiff').value = '';
    document.getElementById('filterDuration').value = '';
    document.getElementById('sortBy').value = 'newest';
    renderResults();
}

// ========== INIT ==========
document.getElementById('searchInput').oninput = renderResults;
document.getElementById('filterEnv').onchange = renderResults;
document.getElementById('filterDiff').onchange = renderResults;
document.getElementById('filterDuration').onchange = renderResults;
document.getElementById('sortBy').onchange = renderResults;

window.openPreview = openPreview;
window.closePreview = closePreview;
window.importChapter = importChapter;
window.rateChapter = rateChapter;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.doSignIn = doSignIn;
window.doSignUp = doSignUp;
window.signInWithGoogle = signInWithGoogle;
window.clearFilters = clearFilters;
window.switchTab = switchTab;
window.openEdit = openEdit;
window.closeEdit = closeEdit;
window.saveEdit = saveEdit;
window.deleteShare = deleteShare;
window.addEditNpc = addEditNpc;
window.removeEditNpc = removeEditNpc;
window.updateEditNpc = updateEditNpc;
window.addEditMusic = addEditMusic;
window.removeEditMusic = removeEditMusic;
window.updateEditMusic = updateEditMusic;

initMode();
applyTheme(localStorage.getItem(LS_THEME) || 'gold');
initAuth();
loadChapters();
