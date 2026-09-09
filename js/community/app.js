import SUPABASE_CONFIG from '../core/config.js';
import { TABLE_COMMUNITY_CHAPTERS, TABLE_COMMUNITY_CHAPTER_RATINGS, TABLE_COMMUNITY_CHAPTER_IMPORTS, TABLE_COMMUNITY_ADVERSARIES, TABLE_COMMUNITY_ADVERSARY_RATINGS, TABLE_COMMUNITY_ADVERSARY_IMPORTS, TABLE_COMMUNITY_HOMEBREW, TABLE_COMMUNITY_HOMEBREW_RATINGS, TABLE_COMMUNITY_HOMEBREW_IMPORTS, LS_THEME } from '../core/constants.js';
import { initMode, applyTheme } from '../core/theme.js';
import { generateId, escHtml as esc } from '../core/utils.js';
import { renderStars, parseFeatureText } from './community-logic.js';

const sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
let chapters = [];
let myShares = [];
let adversaries = [];
let myAdvShares = [];
let userImports = {};
let userRatings = {};
let userAdvRatings = {};
let currentUser = null;
let activeTab = 'chapters';
let editingId = null;
let editQuill = null;
let editNpcs = [];
let editMusic = [];
let homebrews = [];
let myHbShares = [];
let userHbRatings = {};
let editHbFeatures = [];
let editingHbId = null;

const QUILL_TOOLBAR = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'link'],
    ['clean']
];

const SIGN_IN_GATE = '<div class="text-center py-16"><div class="text-3xl mb-4">🔒</div><p class="text-sm text-zinc-500 mb-4">Sign in to browse community content.</p><button onclick="openAuthModal()" class="btn-primary px-8 py-3 text-xs">Sign In</button></div>';

function showSignInGate() {
    ['panelChapters','panelAdversaries','panelHomebrew','panelMyshares'].forEach(id => {
        const panel = document.getElementById(id);
        if (!panel) return;
        Array.from(panel.children).forEach(c => c.style.display = 'none');
        let gate = panel.querySelector('.sign-in-gate');
        if (!gate) {
            gate = document.createElement('div');
            gate.className = 'sign-in-gate';
            gate.innerHTML = SIGN_IN_GATE;
            panel.appendChild(gate);
        }
        gate.style.display = '';
    });
}

function hideSignInGate() {
    ['panelChapters','panelAdversaries','panelHomebrew','panelMyshares'].forEach(id => {
        const panel = document.getElementById(id);
        if (!panel) return;
        Array.from(panel.children).forEach(c => c.style.display = '');
        const gate = panel.querySelector('.sign-in-gate');
        if (gate) gate.style.display = 'none';
    });
}

function loadAllContent() {
    loadChapters();
    loadAdversaries();
    loadHomebrew();
}

// ========== AUTH ==========
async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { currentUser = session.user; hideSignInGate(); await loadUserData(); loadAllContent(); }
    else showSignInGate();
    sb.auth.onAuthStateChange((_, session) => {
        currentUser = session?.user || null;
        if (currentUser) { hideSignInGate(); loadUserData(); loadAllContent(); }
        else showSignInGate();
    });
}


// ========== TABS ==========
function switchTab(tab) {
    activeTab = tab;
    ['chapters', 'adversaries', 'homebrew', 'myshares'].forEach(t => {
        const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) btn.classList.toggle('active', tab === t);
        const panel = document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1));
        if (panel) panel.classList.toggle('hidden', tab !== t);
    });
    if (tab === 'myshares') {
        if (!currentUser) return;
        loadMyShares();
    } else if (tab === 'chapters') {
        renderResults();
    } else if (tab === 'adversaries') {
        renderAdvResults();
    } else if (tab === 'homebrew') {
        renderHbResults();
    }
}

async function loadUserData() {
    if (!currentUser) return;
    const [{ data: imports }, { data: ratings }, { data: advRatings }, { data: hbRatings }] = await Promise.all([
        sb.from(TABLE_COMMUNITY_CHAPTER_IMPORTS).select('chapter_id, imported_version').eq('user_id', currentUser.id),
        sb.from(TABLE_COMMUNITY_CHAPTER_RATINGS).select('chapter_id, rating').eq('user_id', currentUser.id),
        sb.from(TABLE_COMMUNITY_ADVERSARY_RATINGS).select('adversary_id, rating').eq('user_id', currentUser.id),
        sb.from(TABLE_COMMUNITY_HOMEBREW_RATINGS).select('homebrew_id, rating').eq('user_id', currentUser.id)
    ]);
    userImports = {};
    (imports || []).forEach(r => userImports[r.chapter_id] = r.imported_version);
    userRatings = {};
    (ratings || []).forEach(r => userRatings[r.chapter_id] = r.rating);
    userAdvRatings = {};
    (advRatings || []).forEach(r => userAdvRatings[r.adversary_id] = r.rating);
    userHbRatings = {};
    (hbRatings || []).forEach(r => userHbRatings[r.homebrew_id] = r.rating);
    renderResults();
    renderAdvResults();
    renderHbResults();
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
    document.getElementById('mySharesContent').innerHTML = '<div class="text-center text-zinc-600 text-sm py-8">Loading your shares...</div>';
    const [{ data: chData, error: chErr }, { data: advData, error: advErr }, { data: hbData, error: hbErr }] = await Promise.all([
        sb.from(TABLE_COMMUNITY_CHAPTERS).select('*').eq('author_id', currentUser.id).order('created_at', { ascending: false }),
        sb.from(TABLE_COMMUNITY_ADVERSARIES).select('*').eq('author_id', currentUser.id).order('created_at', { ascending: false }),
        sb.from(TABLE_COMMUNITY_HOMEBREW).select('*').eq('author_id', currentUser.id).order('created_at', { ascending: false })
    ]);
    if (chErr) { document.getElementById('mySharesContent').innerHTML = '<div class="text-center text-red-400 text-sm py-8">Failed to load your shares.</div>'; return; }
    myShares = chData || [];
    myAdvShares = advData || [];
    myHbShares = hbData || [];
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
    if (activeTab !== 'chapters') return;
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
        return `<div class="compendium-card cursor-pointer" style="border-top:2px solid var(--accent-1)" onclick="openPreview('${ch.id}')">
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
    const container = document.getElementById('mySharesContent');
    let html = '<div class="mb-6"><div class="flex items-center gap-2 mb-3"><span class="text-base">📜</span><h3 class="font-[Cinzel] text-xs font-bold uppercase tracking-wide" style="color: var(--accent-1)">Chapters</h3></div>';
    if (myShares.length === 0) {
        html += '<div class="text-center text-zinc-600 text-sm py-8">You haven\'t shared any chapters yet. Share from DM Tools → Chronicle.</div>';
    } else {
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + myShares.map(ch => {
            const stars = renderStars(ch.avg_rating || 0);
            const updated = ch.updated_at && ch.updated_at !== ch.created_at ? `Updated ${new Date(ch.updated_at).toLocaleDateString()}` : '';
            return `<div class="compendium-card" style="border-top:2px solid var(--accent-1)">
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
        }).join('') + '</div>';
    }
    html += '</div>';
    // Adversaries section
    html += '<div class="mb-6"><div class="flex items-center gap-2 mb-3"><span class="text-base">👹</span><h3 class="font-[Cinzel] text-xs font-bold uppercase tracking-wide" style="color: var(--accent-1)">Adversaries</h3></div>';
    if (myAdvShares.length === 0) {
        html += '<div class="text-center text-zinc-600 text-sm py-8">You haven\'t shared any adversaries yet. Share from DM Tools → Vault.</div>';
    } else {
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + myAdvShares.map(adv => {
            const stars = renderStars(adv.avg_rating || 0);
            const ad = adv.adversary_data || {};
            return `<div class="compendium-card" style="border-top:2px solid var(--accent-1)">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(adv.title)}</h3>
                </div>
                ${adv.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(adv.description)}</p>` : ''}
                <div class="flex flex-wrap gap-1.5 mb-3">
                    ${ad.type ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${esc(ad.type)}</span>` : ''}
                    ${ad.tier ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Tier ${esc(ad.tier)}</span>` : ''}
                    ${ad.difficulty ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Diff ${esc(ad.difficulty)}</span>` : ''}
                    ${ad.hp ? `<span class="text-[9px] bg-[#2a1a1a] text-red-300 px-2 py-0.5 rounded-full">HP ${esc(ad.hp)}</span>` : ''}
                    ${ad.stress && ad.stress !== '0' ? `<span class="text-[9px] bg-[#2a1a2a] text-purple-300 px-2 py-0.5 rounded-full">Stress ${esc(ad.stress)}</span>` : ''}
                </div>
                <div class="flex items-center justify-between text-[10px] text-zinc-600 mb-3">
                    <span>${stars} (${adv.rating_count || 0}) · 📥 ${adv.import_count || 0}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="openEditAdv('${adv.id}')" class="flex-1 btn-outline text-[10px]">✏️ Edit</button>
                    <button onclick="deleteAdvShare('${adv.id}')" class="btn-outline text-[10px] text-red-400 border-red-900/50 hover:border-red-500 hover:text-red-300">🗑</button>
                </div>
            </div>`;
        }).join('') + '</div>';
    }
    html += '</div>';
    html += '<div class="mb-6"><div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><span class="text-base">🧪</span><h3 class="font-[Cinzel] text-xs font-bold uppercase tracking-wide" style="color: var(--accent-1)">Homebrew</h3><button onclick="openHbGuide()" class="info-btn" title="Homebrew Guidelines">i</button></div></div>';
    if (myHbShares.length === 0) {
        html += '<div class="text-center text-zinc-600 text-sm py-8">You haven\'t shared any homebrew yet. Go to 🧪 Homebrew tab → Create Card.</div>';
    } else {
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + myHbShares.map(hb => {
            const stars = renderStars(hb.avg_rating || 0);
            const cd = hb.card_data || {};
            const isDomain = hb.card_type === 'domain-card';
            return `<div class="compendium-card" style="border-top:2px solid var(--accent-1)">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(hb.title)}</h3>
                </div>
                ${hb.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(hb.description)}</p>` : ''}
                <div class="flex flex-wrap gap-1.5 mb-3">
                    <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${isDomain ? 'Domain Card' : esc(hb.card_category || 'General')}</span>
                    ${isDomain && cd.domain ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${esc(cd.domain)}</span>` : ''}
                    ${isDomain && cd.level ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Lv ${cd.level}</span>` : ''}
                </div>
                <div class="flex items-center justify-between text-[10px] text-zinc-600 mb-3">
                    <span>${stars} (${hb.rating_count || 0}) · 📥 ${hb.import_count || 0}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="openEditHb('${hb.id}')" class="flex-1 btn-outline text-[10px]">✏️ Edit</button>
                    <button onclick="deleteHbShare('${hb.id}')" class="btn-outline text-[10px] text-red-400 border-red-900/50 hover:border-red-500 hover:text-red-300">🗑</button>
                </div>
            </div>`;
        }).join('') + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
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
        const parent = document.getElementById('editEditorWrap').parentNode;
        while (parent.lastChild && parent.lastChild.tagName !== 'LABEL') parent.removeChild(parent.lastChild);
        const fresh = document.createElement('div');
        fresh.id = 'editEditorWrap';
        fresh.className = 'chronicle-editor';
        parent.appendChild(fresh);
        editQuill = new Quill(fresh, { theme: 'snow', placeholder: 'Chapter content...', modules: { toolbar: QUILL_TOOLBAR } });
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
    if (!title) { showToast('Title is required.', 'error'); return; }
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
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    closeEdit();
    await loadMyShares();
    loadChapters();
}

async function deleteShare(id) {
    if (!await showConfirm('Remove this chapter from the community? This cannot be undone.')) return;
    const { error } = await sb.from(TABLE_COMMUNITY_CHAPTERS).delete().eq('id', id).eq('author_id', currentUser.id);
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
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
    const { error: importErr } = await sb.from(TABLE_COMMUNITY_CHAPTER_IMPORTS).upsert({
        chapter_id: id,
        user_id: currentUser.id,
        imported_version: ch.version
    }, { onConflict: 'chapter_id,user_id' });
    if (importErr) { showToast('Import failed: ' + importErr.message, 'error'); return; }

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
            id: generateId('ch'),
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
    const { error } = await sb.from(TABLE_COMMUNITY_CHAPTER_RATINGS).upsert({
        chapter_id: id,
        user_id: currentUser.id,
        rating
    }, { onConflict: 'chapter_id,user_id' });
    if (error) { showToast('Rating failed: ' + error.message, 'error'); return; }
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

// ========== ADVERSARIES: LOAD, FILTER, RENDER ==========
async function loadAdversaries() {
    const { data, error } = await sb.from(TABLE_COMMUNITY_ADVERSARIES)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { document.getElementById('advCommunityStatus').textContent = 'Failed to load adversaries.'; return; }
    adversaries = data || [];
    populateAdvTypeFilter();
    renderAdvResults();
}

function populateAdvTypeFilter() {
    const types = [...new Set(adversaries.map(a => a.adv_type).filter(Boolean))].sort();
    document.getElementById('advFilterType').innerHTML = '<option value="">All</option>' + types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

function getFilteredAdv() {
    let filtered = [...adversaries];
    const search = document.getElementById('advSearchInput').value.trim().toLowerCase();
    const type = document.getElementById('advFilterType').value;
    const tierMin = document.getElementById('advFilterTierMin').value ? parseInt(document.getElementById('advFilterTierMin').value) : null;
    const tierMax = document.getElementById('advFilterTierMax').value ? parseInt(document.getElementById('advFilterTierMax').value) : null;
    const diffMin = document.getElementById('advFilterDiffMin').value ? parseInt(document.getElementById('advFilterDiffMin').value) : null;
    const diffMax = document.getElementById('advFilterDiffMax').value ? parseInt(document.getElementById('advFilterDiffMax').value) : null;
    const sort = document.getElementById('advSortBy').value;
    if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search) || (a.author_nickname || '').toLowerCase().includes(search) || (a.description || '').toLowerCase().includes(search));
    if (type) filtered = filtered.filter(a => (a.adv_type || '') === type);
    if (tierMin !== null) filtered = filtered.filter(a => (parseInt(a.tier) || 0) >= tierMin);
    if (tierMax !== null) filtered = filtered.filter(a => (parseInt(a.tier) || 0) <= tierMax);
    if (diffMin !== null) filtered = filtered.filter(a => (parseInt(a.difficulty) || 0) >= diffMin);
    if (diffMax !== null) filtered = filtered.filter(a => (parseInt(a.difficulty) || 0) <= diffMax);
    if (sort === 'rating') filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (sort === 'popular') filtered.sort((a, b) => (b.import_count || 0) - (a.import_count || 0));
    return filtered;
}

function renderAdvResults() {
    if (activeTab !== 'adversaries') return;
    const filtered = getFilteredAdv();
    const status = document.getElementById('advCommunityStatus');
    const grid = document.getElementById('advCommunityResults');
    if (filtered.length === 0) {
        status.textContent = adversaries.length ? 'No adversaries match your filters.' : 'No shared adversaries yet.';
        status.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }
    status.classList.add('hidden');
    grid.innerHTML = filtered.map(adv => {
        const ad = adv.adversary_data || {};
        const stars = renderStars(adv.avg_rating || 0);
        return `<div class="compendium-card cursor-pointer" style="border-top:2px solid var(--accent-1)" onclick="openAdvPreview('${adv.id}')">
            <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(adv.title)}</h3>
            </div>
            ${adv.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(adv.description)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 mb-3">
                ${ad.type ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${esc(ad.type)}</span>` : ''}
                ${ad.tier ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Tier ${esc(ad.tier)}</span>` : ''}
                ${ad.difficulty ? `<span class="text-[9px] bg-[#1a2a3b] text-blue-300 px-2 py-0.5 rounded-full">Diff ${esc(ad.difficulty)}</span>` : ''}
                ${ad.hp ? `<span class="text-[9px] bg-[#2a1a1a] text-red-300 px-2 py-0.5 rounded-full">HP ${esc(ad.hp)}</span>` : ''}
                ${ad.stress && ad.stress !== '0' ? `<span class="text-[9px] bg-[#2a1a2a] text-purple-300 px-2 py-0.5 rounded-full">Stress ${esc(ad.stress)}</span>` : ''}
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-600">
                <span>by ${esc(adv.author_nickname || 'Unknown')}</span>
                <div class="flex items-center gap-2">
                    <span>${stars} (${adv.rating_count || 0})</span>
                    <span>📥 ${adv.import_count || 0}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function clearAdvFilters() {
    document.getElementById('advSearchInput').value = '';
    document.getElementById('advFilterType').value = '';
    document.getElementById('advFilterTierMin').value = '';
    document.getElementById('advFilterTierMax').value = '';
    document.getElementById('advFilterDiffMin').value = '';
    document.getElementById('advFilterDiffMax').value = '';
    document.getElementById('advSortBy').value = 'newest';
    renderAdvResults();
}

// ========== ADVERSARY PREVIEW ==========
let previewAdv = null;

function openAdvPreview(id) {
    const adv = adversaries.find(a => a.id === id);
    if (!adv) return;
    previewAdv = adv;
    const ad = adv.adversary_data || {};
    const [major, severe] = (ad.thresholds || '').split('/').map(s => s.trim());
    const features = ad.feature || [];
    const myRating = userAdvRatings[adv.id] || 0;

    let html = `<div class="space-y-5">
        <div>
            <h2 class="font-[Cinzel] text-lg font-black text-[#f5efe6] mb-1">${esc(adv.title)}</h2>
            <div class="text-[10px] text-zinc-500">by ${esc(adv.author_nickname || 'Unknown')} · ${new Date(adv.created_at).toLocaleDateString()}</div>
        </div>
        ${adv.description ? `<p class="text-xs text-zinc-400 italic">${esc(adv.description)}</p>` : ''}
        <div class="flex flex-wrap gap-1.5">
            ${ad.type ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${esc(ad.type)}</span>` : ''}
            ${ad.tier ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Tier ${esc(ad.tier)}</span>` : ''}
            ${ad.difficulty ? `<span class="text-[9px] bg-[#1a2a3b] border border-[#2a3d5a] rounded px-1.5 py-0.5 text-blue-300">Difficulty ${esc(ad.difficulty)}</span>` : ''}
            ${ad.hp ? `<span class="text-[9px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-300">HP ${esc(ad.hp)}</span>` : ''}
            ${ad.stress && ad.stress !== '0' ? `<span class="text-[9px] bg-[#2a1a2a] border border-[#3d2a3d] rounded px-1.5 py-0.5 text-purple-300">Stress ${esc(ad.stress)}</span>` : ''}
            ${major ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Major ${esc(major)}+</span>` : ''}
            ${severe ? `<span class="text-[9px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-400">Severe ${esc(severe)}+</span>` : ''}
        </div>
        <div class="border-t border-[#3d362a] pt-4 space-y-2">
            <div class="text-xs text-[#e8e0d4]">${(ad.attacks && ad.attacks.length ? ad.attacks : (ad.attack ? [{name: ad.attack, damage: ad.damage, range: ad.range, atk: ad.atk}] : [])).map(a => `⚔️ <span class="font-bold">${esc(a.name || '')}</span>${(a.atk || ad.atk) ? ' · ' + esc(a.atk || ad.atk || '') : ''} · ${esc(a.damage || '')} · ${esc(a.range || '')}`).join('<br>')}</div>
            ${ad.experience ? `<div class="text-xs text-[#e8e0d4]">📋 ${esc(ad.experience)}</div>` : ''}
            ${ad.motives_and_tactics ? `<div class="text-xs text-[#e8e0d4]">🎯 ${esc(ad.motives_and_tactics)}</div>` : ''}
            ${ad.ability ? `<div class="text-xs text-[#e8e0d4]">✨ ${esc(ad.ability)}</div>` : ''}
            ${ad.description ? `<div class="text-xs text-zinc-400 italic">${esc(ad.description)}</div>` : ''}
            ${features.length ? `<div class="space-y-1.5 mt-2">${features.map(f => `<div><div class="text-xs font-bold text-amber-200">${esc(f.name || '')}</div><div class="text-xs text-[#e8e0d4]">${esc(f.text || '')}</div></div>`).join('')}</div>` : ''}
        </div>
        <div class="border-t border-[#3d362a] pt-4 flex items-center justify-between">
            <div><span class="text-[10px] text-zinc-500 uppercase font-bold">Your Rating:</span> <span id="advPreviewStars">${renderInteractiveAdvStars(adv.id, myRating)}</span></div>
            <div class="text-[10px] text-zinc-500">${renderStars(adv.avg_rating || 0)} (${adv.rating_count || 0} ratings) · 📥 ${adv.import_count || 0}</div>
        </div>
        <div class="flex gap-3"><button onclick="addAdvToVault('${adv.id}')" class="flex-1 btn-primary">Add to Vault</button></div>
    </div>`;

    document.getElementById('advPreviewContent').innerHTML = html;
    document.getElementById('advPreviewModal').classList.remove('hidden');
}

function closeAdvPreview() {
    document.getElementById('advPreviewModal').classList.add('hidden');
    previewAdv = null;
}

function renderInteractiveAdvStars(advId, current) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= current;
        s += `<span class="cursor-pointer text-lg ${filled ? 'text-[#d4a017]' : 'text-zinc-600'} hover:text-[#d4a017] transition-colors" onclick="event.stopPropagation(); rateAdversary('${advId}', ${i})">${filled ? '★' : '☆'}</span>`;
    }
    return s;
}

// ========== ADVERSARY: ADD TO VAULT ==========
async function addAdvToVault(id) {
    if (!currentUser) { openAuthModal(); return; }
    const adv = adversaries.find(a => a.id === id);
    if (!adv) return;
    const ad = adv.adversary_data || {};

    // Track unique import
    const { error: importErr } = await sb.from(TABLE_COMMUNITY_ADVERSARY_IMPORTS).upsert({
        adversary_id: id,
        user_id: currentUser.id,
        imported_version: adv.version || 1
    }, { onConflict: 'adversary_id,user_id' });
    if (importErr) { showToast('Add failed: ' + importErr.message, 'error'); return; }

    // Increment add count
    await sb.from(TABLE_COMMUNITY_ADVERSARIES).update({ import_count: (adv.import_count || 0) + 1 }).eq('id', id);
    adv.import_count = (adv.import_count || 0) + 1;

    // Store in vault via localStorage
    try {
        const key = 'dh_dm_vault';
        const vault = JSON.parse(localStorage.getItem(key) || '[]');
        vault.push({
            id: generateId('c'),
            name: ad.name || adv.title,
            evasion: parseInt(ad.difficulty) || 10,
            hpMax: parseInt(ad.hp) || 1, hpFilled: parseInt(ad.hp) || 1,
            stressMax: parseInt(ad.stress) || 0, stressFilled: parseInt(ad.stress) || 0,
            hopeMax: 0, hopeFilled: 0, armorMax: 0, armorFilled: 0,
            enemyData: ad,
            notes: ''
        });
        localStorage.setItem(key, JSON.stringify(vault));
    } catch {}

    closeAdvPreview();
    renderAdvResults();
    showToast('Adversary added to Vault! Open DM Tools → Vault to find it.');
}

// ========== ADVERSARY: RATE ==========
async function rateAdversary(id, rating) {
    if (!currentUser) { openAuthModal(); return; }
    const { error } = await sb.from(TABLE_COMMUNITY_ADVERSARY_RATINGS).upsert({
        adversary_id: id,
        user_id: currentUser.id,
        rating
    }, { onConflict: 'adversary_id,user_id' });
    if (error) { showToast('Rating failed: ' + error.message, 'error'); return; }
    userAdvRatings[id] = rating;
    const { data } = await sb.from(TABLE_COMMUNITY_ADVERSARIES).select('avg_rating, rating_count').eq('id', id).single();
    if (data) {
        const adv = adversaries.find(a => a.id === id);
        if (adv) { adv.avg_rating = data.avg_rating; adv.rating_count = data.rating_count; }
    }
    const starsEl = document.getElementById('advPreviewStars');
    if (starsEl) starsEl.innerHTML = renderInteractiveAdvStars(id, rating);
    renderAdvResults();
}

// ========== ADVERSARY: EDIT / DELETE (MY SHARES) ==========
let editingAdvId = null;

function openEditAdv(id) {
    const adv = myAdvShares.find(a => a.id === id);
    if (!adv) return;
    editingAdvId = id;
    const ad = adv.adversary_data || {};
    const [major, severe] = (ad.thresholds || '').split('/').map(s => s.trim());
    document.getElementById('editAdvTitle').value = adv.title || '';
    document.getElementById('editAdvDescription').value = adv.description || '';
    document.getElementById('editAdvType').value = ad.type || '';
    document.getElementById('editAdvTier').value = ad.tier || '';
    document.getElementById('editAdvDifficulty').value = ad.difficulty || '';
    document.getElementById('editAdvHp').value = ad.hp || '';
    document.getElementById('editAdvStress').value = ad.stress || '';
    document.getElementById('editAdvMajor').value = major || '';
    document.getElementById('editAdvSevere').value = severe || '';
    document.getElementById('editAdvAttack').value = ad.attack || '';
    document.getElementById('editAdvDamage').value = ad.damage || '';
    document.getElementById('editAdvRange').value = ad.range || '';
    document.getElementById('editAdvMotives').value = ad.motives_and_tactics || '';
    document.getElementById('editAdvExperience').value = ad.experience || '';
    document.getElementById('editAdvAbility').value = ad.ability || '';
    document.getElementById('editAdvLore').value = ad.description || '';
    document.getElementById('editAdvFeatures').value = (ad.feature || []).map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n');
    document.getElementById('editAdvModal').classList.remove('hidden');
}

function closeEditAdv() {
    document.getElementById('editAdvModal').classList.add('hidden');
    editingAdvId = null;
}

async function saveEditAdv() {
    if (!editingAdvId || !currentUser) return;
    const title = document.getElementById('editAdvTitle').value.trim();
    if (!title) { showToast('Title is required.', 'error'); return; }
    const major = document.getElementById('editAdvMajor').value.trim();
    const severe = document.getElementById('editAdvSevere').value.trim();
    const thresholds = (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
    const featuresRaw = document.getElementById('editAdvFeatures').value.trim();
    const features = parseFeatureText(featuresRaw);
    const advType = document.getElementById('editAdvType').value.trim();
    const tier = document.getElementById('editAdvTier').value.trim();
    const difficulty = document.getElementById('editAdvDifficulty').value.trim();
    const updates = {
        title,
        description: document.getElementById('editAdvDescription').value.trim() || null,
        adv_type: advType,
        tier,
        difficulty,
        adversary_data: {
            name: title,
            hp: document.getElementById('editAdvHp').value.trim(),
            stress: document.getElementById('editAdvStress').value.trim(),
            difficulty,
            thresholds,
            type: advType,
            tier,
            attack: document.getElementById('editAdvAttack').value.trim(),
            damage: document.getElementById('editAdvDamage').value.trim(),
            range: document.getElementById('editAdvRange').value.trim(),
            atk: '',
            attacks: [],
            experience: document.getElementById('editAdvExperience').value.trim(),
            motives_and_tactics: document.getElementById('editAdvMotives').value.trim(),
            ability: document.getElementById('editAdvAbility').value.trim(),
            description: document.getElementById('editAdvLore').value.trim(),
            feature: features
        },
        version: (myAdvShares.find(a => a.id === editingAdvId)?.version || 1) + 1,
        updated_at: new Date().toISOString()
    };
    const { error } = await sb.from(TABLE_COMMUNITY_ADVERSARIES).update(updates).eq('id', editingAdvId).eq('author_id', currentUser.id);
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    closeEditAdv();
    await loadMyShares();
    loadAdversaries();
}

async function deleteAdvShare(id) {
    if (!await showConfirm('Remove this adversary from the community? This cannot be undone.')) return;
    const { error } = await sb.from(TABLE_COMMUNITY_ADVERSARIES).delete().eq('id', id).eq('author_id', currentUser.id);
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
    myAdvShares = myAdvShares.filter(a => a.id !== id);
    renderMyShares();
    loadAdversaries();
}

// ========== HOMEBREW: GUIDELINES ==========
function openHbGuide() { document.getElementById('hbGuideModal').classList.remove('hidden'); }
function closeHbGuide() { document.getElementById('hbGuideModal').classList.add('hidden'); }

// ========== HOMEBREW: EDIT & DELETE (MY SHARES) ==========
function openEditHb(id) {
    const hb = myHbShares.find(h => h.id === id);
    if (!hb) return;
    editingHbId = id;
    const cd = hb.card_data || {};
    document.getElementById('editHbTitle').value = hb.title || '';
    document.getElementById('editHbDesc').value = hb.description || '';

    // Parse features back from HTML
    editHbFeatures = [];
    if (cd.feature) {
        const tmp = document.createElement('div');
        tmp.innerHTML = cd.feature;
        const bolds = tmp.querySelectorAll('.text-amber-400, [class*="text-amber"]');
        const descs = tmp.querySelectorAll('.text-zinc-400, [class*="text-zinc-400"]');
        bolds.forEach((b, i) => {
            editHbFeatures.push({ name: b.textContent || '', text: descs[i]?.textContent || '' });
        });
    }
    if (!editHbFeatures.length && cd.feature) {
        editHbFeatures.push({ name: '', text: cd.feature.replace(/<[^>]*>/g, '') });
    }

    // Render type-specific editable fields
    const fieldsEl = document.getElementById('editHbCardFields');
    if (hb.card_type === 'domain-card') {
        fieldsEl.innerHTML = `
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Card Name</label><input id="editHbCardName" type="text" maxlength="80" class="w-full input-field" value="${esc(cd.name || '')}"></div>
            <div class="grid grid-cols-2 gap-3 mt-3">
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Domain</label>
                    <select id="editHbDomain" class="w-full select-field"><option value="">Select...</option>${['ARCANA','BLADE','BONE','CODEX','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'].map(d => `<option${cd.domain===d?' selected':''}>${d}</option>`).join('')}</select>
                </div>
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Type</label>
                    <select id="editHbDomainType" class="w-full select-field"><option value="">Select...</option><option${cd.type==='ABILITY'?' selected':''}>ABILITY</option><option${cd.type==='SPELL'?' selected':''}>SPELL</option></select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-3">
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Level</label><input id="editHbLevel" type="number" min="1" max="10" class="w-full input-field" value="${cd.level || ''}"></div>
                <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Recall Cost</label><input id="editHbRecall" type="number" min="0" max="10" class="w-full input-field" value="${cd.recallCost || ''}"></div>
            </div>`;
    } else {
        fieldsEl.innerHTML = `
            <div><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Category</label>
                <select id="editHbCategory" class="w-full select-field">${['ancestries','communities','classes','subclasses','homebrew'].map(c => `<option value="${c}"${hb.card_category===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}</select>
            </div>
            <div class="mt-3"><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Card Name</label><input id="editHbCardName" type="text" maxlength="80" class="w-full input-field" value="${esc(cd.name || '')}"></div>
            <div class="mt-3"><label class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold block mb-1">Card Description</label><textarea id="editHbCardDesc" rows="3" class="w-full input-field resize-y">${esc(cd.desc ? cd.desc.replace(/<[^>]*>/g, '') : '')}</textarea></div>`;
    }

    renderEditHbFeatures();
    document.getElementById('editHbModal').classList.remove('hidden');
}

function closeEditHb() {
    document.getElementById('editHbModal').classList.add('hidden');
    editingHbId = null;
}

function addEditHbFeature() { editHbFeatures.push({ name: '', text: '' }); renderEditHbFeatures(); }
function removeEditHbFeature(i) { editHbFeatures.splice(i, 1); renderEditHbFeatures(); }
function updateEditHbFeature(i, field, val) { if (editHbFeatures[i]) editHbFeatures[i][field] = val; }

function renderEditHbFeatures() {
    const el = document.getElementById('editHbFeatureList');
    if (!editHbFeatures.length) { el.innerHTML = '<div class="text-[10px] text-zinc-600 italic">No features</div>'; return; }
    el.innerHTML = editHbFeatures.map((f, i) => `<div class="flex gap-1.5 items-start">
        <input value="${esc(f.name)}" onchange="updateEditHbFeature(${i},'name',this.value)" placeholder="Name" class="input-compact text-left px-2 flex-1">
        <textarea onchange="updateEditHbFeature(${i},'text',this.value)" placeholder="Description" rows="2" class="input-compact text-left px-2 flex-[2] resize-y">${esc(f.text)}</textarea>
        <button onclick="removeEditHbFeature(${i})" class="btn-remove text-xs mt-1">\u2715</button>
    </div>`).join('');
}

async function saveEditHb() {
    if (!editingHbId || !currentUser) return;
    const hb = myHbShares.find(h => h.id === editingHbId);
    if (!hb) return;
    const title = document.getElementById('editHbTitle').value.trim();
    if (!title) { showToast('Title is required.', 'error'); return; }

    const featureHtml = editHbFeatures.filter(f => f.name || f.text).map(f =>
        `<div class="text-[11px] font-bold text-amber-400 mt-1">${esc(f.name)}</div><div class="text-[11px] text-zinc-400 leading-relaxed">${esc(f.text)}</div>`
    ).join('');

    const cardName = document.getElementById('editHbCardName').value.trim();
    let cardData, cardCategory = hb.card_category;
    if (hb.card_type === 'domain-card') {
        const domain = document.getElementById('editHbDomain').value;
        const dtype = document.getElementById('editHbDomainType').value;
        const level = parseInt(document.getElementById('editHbLevel').value) || 1;
        const recallCost = parseInt(document.getElementById('editHbRecall').value) || 0;
        cardData = { name: cardName, desc: '', feature: featureHtml, category: 'domain-cards.json', domain, type: dtype, level, recallCost };
    } else {
        cardCategory = document.getElementById('editHbCategory').value;
        const desc = document.getElementById('editHbCardDesc').value.trim();
        cardData = { name: cardName, desc: esc(desc), feature: featureHtml, category: cardCategory + '.json', domain: '', type: '', level: undefined, recallCost: undefined };
    }

    const updates = {
        title,
        description: document.getElementById('editHbDesc').value.trim() || null,
        card_category: cardCategory,
        card_data: cardData,
        version: (hb.version || 1) + 1,
        updated_at: new Date().toISOString()
    };
    const { error } = await sb.from(TABLE_COMMUNITY_HOMEBREW).update(updates).eq('id', editingHbId).eq('author_id', currentUser.id);
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    closeEditHb();
    await loadMyShares();
    loadHomebrew();
}

async function deleteHbShare(id) {
    if (!await showConfirm('Remove this homebrew from the community? This cannot be undone.')) return;
    const { error } = await sb.from(TABLE_COMMUNITY_HOMEBREW).delete().eq('id', id).eq('author_id', currentUser.id);
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
    myHbShares = myHbShares.filter(h => h.id !== id);
    renderMyShares();
    loadHomebrew();
}

// ========== HOMEBREW: PREVIEW, RATE, IMPORT ==========
let previewHb = null;

function openHbPreview(id) {
    const hb = homebrews.find(h => h.id === id);
    if (!hb) return;
    previewHb = hb;
    const cd = hb.card_data || {};
    const isDomain = hb.card_type === 'domain-card';
    const myRating = userHbRatings[hb.id] || 0;

    let html = `<div class="space-y-5">
        <div>
            <h2 class="font-[Cinzel] text-lg font-black text-[#f5efe6] mb-1">${esc(hb.title)}</h2>
            <div class="text-[10px] text-zinc-500">by ${esc(hb.author_nickname || 'Unknown')} \u00b7 v${hb.version} \u00b7 ${new Date(hb.created_at).toLocaleDateString()}</div>
        </div>
        ${hb.description ? `<p class="text-xs text-zinc-400 italic">${esc(hb.description)}</p>` : ''}
        <div class="flex flex-wrap gap-1.5">
            <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${isDomain ? 'Domain Card' : esc(hb.card_category || 'General')}</span>
            ${isDomain && cd.domain ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${esc(cd.domain)}</span>` : ''}
            ${isDomain && cd.type ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${esc(cd.type)}</span>` : ''}
            ${isDomain && cd.level ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Level ${cd.level}</span>` : ''}
            ${isDomain && cd.recallCost !== undefined ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Recall ${cd.recallCost}</span>` : ''}
        </div>
        <div class="border-t border-[#3d362a] pt-4">
            <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Card: ${esc(cd.name || '')}</div>
            ${cd.desc ? `<div class="text-xs text-zinc-400 mb-2">${cd.desc}</div>` : ''}
            ${cd.feature ? `<div class="text-xs text-[#e8e0d4] leading-relaxed">${cd.feature}</div>` : ''}
        </div>
        <div class="border-t border-[#3d362a] pt-4 flex items-center justify-between">
            <div><span class="text-[10px] text-zinc-500 uppercase font-bold">Your Rating:</span> <span id="hbPreviewStars">${renderInteractiveHbStars(hb.id, myRating)}</span></div>
            <div class="text-[10px] text-zinc-500">${renderStars(hb.avg_rating || 0)} (${hb.rating_count || 0} ratings) \u00b7 \ud83d\udce5 ${hb.import_count || 0}</div>
        </div>
        <div class="flex gap-3"><button onclick="importHomebrew('${hb.id}')" class="flex-1 btn-primary">Add to Character Sheet</button></div>
    </div>`;

    document.getElementById('hbPreviewContent').innerHTML = html;
    document.getElementById('hbPreviewModal').classList.remove('hidden');
}

function closeHbPreview() {
    document.getElementById('hbPreviewModal').classList.add('hidden');
    previewHb = null;
}

function renderInteractiveHbStars(hbId, current) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= current;
        s += `<span class="cursor-pointer text-lg ${filled ? 'text-[#d4a017]' : 'text-zinc-600'} hover:text-[#d4a017] transition-colors" onclick="event.stopPropagation(); rateHomebrew('${hbId}', ${i})">${filled ? '\u2605' : '\u2606'}</span>`;
    }
    return s;
}

async function rateHomebrew(id, rating) {
    if (!currentUser) { openAuthModal(); return; }
    const { error } = await sb.from(TABLE_COMMUNITY_HOMEBREW_RATINGS).upsert({
        homebrew_id: id, user_id: currentUser.id, rating
    }, { onConflict: 'homebrew_id,user_id' });
    if (error) { showToast('Rating failed: ' + error.message, 'error'); return; }
    userHbRatings[id] = rating;
    const { data } = await sb.from(TABLE_COMMUNITY_HOMEBREW).select('avg_rating, rating_count').eq('id', id).single();
    if (data) {
        const hb = homebrews.find(h => h.id === id);
        if (hb) { hb.avg_rating = data.avg_rating; hb.rating_count = data.rating_count; }
    }
    const starsEl = document.getElementById('hbPreviewStars');
    if (starsEl) starsEl.innerHTML = renderInteractiveHbStars(id, rating);
    renderHbResults();
}

async function importHomebrew(id) {
    if (!currentUser) { openAuthModal(); return; }
    const hb = homebrews.find(h => h.id === id);
    if (!hb) return;
    const cd = hb.card_data;
    if (!cd) { showToast('Card data missing.', 'error'); return; }

    // Track import
    const { error: importErr } = await sb.from(TABLE_COMMUNITY_HOMEBREW_IMPORTS).upsert({
        homebrew_id: id, user_id: currentUser.id, imported_version: hb.version || 1
    }, { onConflict: 'homebrew_id,user_id' });
    if (importErr) { showToast('Import failed: ' + importErr.message, 'error'); return; }

    // Increment count
    await sb.from(TABLE_COMMUNITY_HOMEBREW).update({ import_count: (hb.import_count || 0) + 1 }).eq('id', id);
    hb.import_count = (hb.import_count || 0) + 1;

    // Store in character sheet localStorage
    try {
        const key = 'dh_sheet';
        const sheet = JSON.parse(localStorage.getItem(key) || '{}');
        const cards = sheet.cards || [];
        const importedCard = { ...cd };
        delete importedCard._homebrew;
        cards.push(importedCard);
        sheet.cards = cards;
        localStorage.setItem(key, JSON.stringify(sheet));
    } catch {}

    closeHbPreview();
    renderHbResults();
    showToast('Card added! Open your Character Sheet \u2192 Cards tab to find it.');
}

// ========== HOMEBREW: FILTER & RENDER ==========
function getFilteredHb() {
    let filtered = [...homebrews];
    const search = document.getElementById('hbSearchInput').value.trim().toLowerCase();
    const type = document.getElementById('hbFilterType').value;
    const cat = document.getElementById('hbFilterCategory').value;
    const domain = document.getElementById('hbFilterDomain').value;
    const sort = document.getElementById('hbSortBy').value;
    if (search) filtered = filtered.filter(h => h.title.toLowerCase().includes(search) || (h.author_nickname || '').toLowerCase().includes(search) || (h.description || '').toLowerCase().includes(search));
    if (type) filtered = filtered.filter(h => h.card_type === type);
    if (cat) filtered = filtered.filter(h => h.card_category === cat);
    if (domain) filtered = filtered.filter(h => h.card_type === 'domain-card' && (h.card_data || {}).domain === domain);
    if (sort === 'rating') filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (sort === 'popular') filtered.sort((a, b) => (b.import_count || 0) - (a.import_count || 0));
    return filtered;
}

function renderHbResults() {
    if (activeTab !== 'homebrew') return;
    const filtered = getFilteredHb();
    const status = document.getElementById('hbCommunityStatus');
    const grid = document.getElementById('hbCommunityResults');
    if (filtered.length === 0) {
        status.textContent = homebrews.length ? 'No homebrew matches your filters.' : 'No homebrew shared yet. Be the first!';
        status.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }
    status.classList.add('hidden');
    grid.innerHTML = filtered.map(hb => {
        const cd = hb.card_data || {};
        const isDomain = hb.card_type === 'domain-card';
        const stars = renderStars(hb.avg_rating || 0);
        return `<div class="compendium-card cursor-pointer" style="border-top:2px solid var(--accent-1)" onclick="openHbPreview('${hb.id}')">
            <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-[Cinzel] text-sm font-bold text-[#f5efe6] leading-tight">${esc(hb.title)}</h3>
            </div>
            ${hb.description ? `<p class="text-[11px] text-zinc-500 mb-3 line-clamp-2">${esc(hb.description)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 mb-3">
                <span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${isDomain ? 'Domain Card' : esc(hb.card_category || 'General')}</span>
                ${isDomain && cd.domain ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${esc(cd.domain)}</span>` : ''}
                ${isDomain && cd.type ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">${esc(cd.type)}</span>` : ''}
                ${isDomain && cd.level ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Lv ${cd.level}</span>` : ''}
                ${isDomain && cd.recallCost !== undefined ? `<span class="text-[9px] bg-[#2a2418] text-zinc-400 px-2 py-0.5 rounded-full">Recall ${cd.recallCost}</span>` : ''}
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-600">
                <span>by ${esc(hb.author_nickname || 'Unknown')}</span>
                <div class="flex items-center gap-2">
                    <span>${stars} (${hb.rating_count || 0})</span>
                    <span>📥 ${hb.import_count || 0}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function clearHbFilters() {
    document.getElementById('hbSearchInput').value = '';
    document.getElementById('hbFilterType').value = '';
    document.getElementById('hbFilterCategory').value = '';
    document.getElementById('hbFilterDomain').value = '';
    document.getElementById('hbSortBy').value = 'newest';
    renderHbResults();
}

// ========== HOMEBREW: LOAD ==========
async function loadHomebrew() {
    const { data, error } = await sb.from(TABLE_COMMUNITY_HOMEBREW)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { document.getElementById('hbCommunityStatus').textContent = 'Failed to load homebrew.'; return; }
    homebrews = data || [];
    renderHbResults();
}

// ========== AUTH MODAL ==========




function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

async function doSignIn() {
    const email = document.getElementById('authEmail').value.trim();
    const pw = document.getElementById('authPassword').value;
    if (!email || !pw) { showToast('Please enter email and password.', 'error'); return; }
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) showToast('Sign-in failed: ' + error.message, 'error');
    else closeAuthModal();
}

async function doSignUp() {
    const email = document.getElementById('authEmail').value.trim();
    const pw = document.getElementById('authPassword').value;
    if (!email || !pw) { showToast('Please enter email and password.', 'error'); return; }
    if (pw.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    const { error } = await sb.auth.signUp({ email, password: pw });
    if (error) showToast('Sign-up failed: ' + error.message, 'error');
    else showToast('Check your email for a confirmation link!');
}

async function signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showToast('Google sign-in failed: ' + error.message, 'error');
}

// ========== UTILS ==========

function showToast(msg, type = 'success') {
    const colors = { success: 'var(--accent-1)', error: '#ef4444', info: '#71717a' };
    const el = document.createElement('div');
    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1e1b16] border text-[#f5efe6] text-xs px-5 py-3 rounded-lg shadow-lg z-[999] font-[Cinzel] tracking-wide transition-opacity duration-300';
    el.style.borderColor = colors[type] || colors.success;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

function showConfirm(msg) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmMsg').textContent = msg;
        const yes = document.getElementById('confirmYes');
        const no = document.getElementById('confirmNo');
        const close = () => { modal.classList.add('hidden'); yes.onclick = null; no.onclick = null; };
        yes.onclick = () => { close(); resolve(true); };
        no.onclick = () => { close(); resolve(false); };
        modal.classList.remove('hidden');
    });
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
window.clearAdvFilters = clearAdvFilters;
window.switchTab = switchTab;
window.openEdit = openEdit;
window.closeEdit = closeEdit;
window.saveEdit = saveEdit;
window.deleteShare = deleteShare;
window.openAdvPreview = openAdvPreview;
window.closeAdvPreview = closeAdvPreview;
window.addAdvToVault = addAdvToVault;
window.rateAdversary = rateAdversary;
window.openEditAdv = openEditAdv;
window.closeEditAdv = closeEditAdv;
window.saveEditAdv = saveEditAdv;
window.deleteAdvShare = deleteAdvShare;
window.addEditNpc = addEditNpc;
window.removeEditNpc = removeEditNpc;
window.updateEditNpc = updateEditNpc;
window.addEditMusic = addEditMusic;
window.removeEditMusic = removeEditMusic;
window.updateEditMusic = updateEditMusic;

window.openHbGuide = openHbGuide;
window.closeHbGuide = closeHbGuide;
window.clearHbFilters = clearHbFilters;
window.openHbPreview = openHbPreview;
window.closeHbPreview = closeHbPreview;
window.rateHomebrew = rateHomebrew;
window.importHomebrew = importHomebrew;
window.openEditHb = openEditHb;
window.closeEditHb = closeEditHb;
window.saveEditHb = saveEditHb;
window.deleteHbShare = deleteHbShare;
window.addEditHbFeature = addEditHbFeature;
window.removeEditHbFeature = removeEditHbFeature;
window.updateEditHbFeature = updateEditHbFeature;

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('confirmModal').classList.contains('hidden')) { document.getElementById('confirmNo').click(); return; }
    if (!document.getElementById('hbGuideModal').classList.contains('hidden')) closeHbGuide();
    if (!document.getElementById('editHbModal').classList.contains('hidden')) closeEditHb();
    else if (!document.getElementById('hbPreviewModal').classList.contains('hidden')) closeHbPreview();
    else if (!document.getElementById('editAdvModal').classList.contains('hidden')) closeEditAdv();
    else if (!document.getElementById('advPreviewModal').classList.contains('hidden')) closeAdvPreview();
    else if (!document.getElementById('editModal').classList.contains('hidden')) closeEdit();
    else if (!document.getElementById('previewModal').classList.contains('hidden')) closePreview();
    else if (!document.getElementById('authModal').classList.contains('hidden')) closeAuthModal();
});

initMode();
applyTheme(localStorage.getItem(LS_THEME) || 'gold');
initAuth();

document.getElementById('advSearchInput').oninput = renderAdvResults;
document.getElementById('advFilterType').onchange = renderAdvResults;
document.getElementById('advFilterTierMin').oninput = renderAdvResults;
document.getElementById('advFilterTierMax').oninput = renderAdvResults;
document.getElementById('advFilterDiffMin').oninput = renderAdvResults;
document.getElementById('advFilterDiffMax').oninput = renderAdvResults;
document.getElementById('advSortBy').onchange = renderAdvResults;

document.getElementById('hbSearchInput').oninput = renderHbResults;
document.getElementById('hbFilterType').onchange = renderHbResults;
document.getElementById('hbFilterCategory').onchange = renderHbResults;
document.getElementById('hbFilterDomain').onchange = renderHbResults;
document.getElementById('hbSortBy').onchange = renderHbResults;

