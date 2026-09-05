import { escHtml, escHtmlAttr } from './app.js';
import { showConfirm, getUser, getProfile, getSupabase, showAlert } from '../core/auth.js';
import { LS_DM_CHRONICLE, TABLE_COMMUNITY_CHAPTERS } from '../core/constants.js';
const CHRONICLE_KEY = LS_DM_CHRONICLE;
const DISMISSED_KEY = 'dh_dm_dismissed_updates';
let _chronicleEntries = [];
const _quillInstances = {};
let _importUpdates = {}; // { community_id: remoteVersion }
let _dismissedUpdates = {};

export function chronicleEntries() { return _chronicleEntries; }
export function setChronicleEntries(v) { _chronicleEntries = v; }

export function autoCacheChronicle() {
    localStorage.setItem(CHRONICLE_KEY, JSON.stringify(_chronicleEntries));
    if (typeof window._markCloudDirty === 'function') window._markCloudDirty();
}

export function initChronicle() {
    try { _chronicleEntries = JSON.parse(localStorage.getItem(CHRONICLE_KEY)) || []; } catch { _chronicleEntries = []; }
    try { _dismissedUpdates = JSON.parse(localStorage.getItem(DISMISSED_KEY)) || {}; } catch { _dismissedUpdates = {}; }
    checkImportUpdates();
}

export function addEntry() {
    _chronicleEntries.unshift({ id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), title: 'New Chapter', text: '', npcs: [], music: [], open: true });
    autoCacheChronicle(); renderChronicle();
}

function removeEntry(id) {
    const ch = _chronicleEntries.find(c => c.id === id);
    showConfirm(`Remove ${ch ? ch.title : 'this chapter'}?`, () => {
        delete _quillInstances[id];
        _chronicleEntries = _chronicleEntries.filter(c => c.id !== id);
        autoCacheChronicle(); renderChronicle();
    });
}
function updateEntryTitle(id, value) { const ch = _chronicleEntries.find(c => c.id === id); if (ch) { ch.title = value || 'Untitled Chapter'; autoCacheChronicle(); } }
function updateEntryText(id, value) { const ch = _chronicleEntries.find(c => c.id === id); if (ch) { ch.text = value; autoCacheChronicle(); } }
function toggleEntry(id) {
    const ch = _chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    // Save current Quill content before collapsing
    if (ch.open && _quillInstances[id]) {
        ch.text = _quillInstances[id].root.innerHTML;
        delete _quillInstances[id];
    }
    ch.open = !ch.open;
    autoCacheChronicle(); renderChronicle();
}

function addChapterNpc(chId) { const ch = _chronicleEntries.find(c => c.id === chId); if (!ch) return; if (!ch.npcs) ch.npcs = []; ch.npcs.push({ name: '', faction: '', disposition: '', notes: '' }); saveQuillContent(chId); autoCacheChronicle(); renderChronicle(); }
function removeChapterNpc(chId, idx) { const ch = _chronicleEntries.find(c => c.id === chId); if (!ch || !ch.npcs) return; ch.npcs.splice(idx, 1); saveQuillContent(chId); autoCacheChronicle(); renderChronicle(); }
function updateChapterNpc(chId, idx, field, value) { const ch = _chronicleEntries.find(c => c.id === chId); if (!ch || !ch.npcs || !ch.npcs[idx]) return; ch.npcs[idx][field] = value; autoCacheChronicle(); }

function addChapterMusic(chId) { const ch = _chronicleEntries.find(c => c.id === chId); if (!ch) return; if (!ch.music) ch.music = []; ch.music.push({ scene: '', cue: '' }); saveQuillContent(chId); autoCacheChronicle(); renderChronicle(); }
function removeChapterMusic(chId, idx) { const ch = _chronicleEntries.find(c => c.id === chId); if (!ch || !ch.music) return; ch.music.splice(idx, 1); saveQuillContent(chId); autoCacheChronicle(); renderChronicle(); }
function updateChapterMusic(chId, idx, field, value) {
    const ch = _chronicleEntries.find(c => c.id === chId); if (!ch || !ch.music || !ch.music[idx]) return;
    const wasLink = ch.music[idx].cue && ch.music[idx].cue.match(/^https?:\/\//);
    ch.music[idx][field] = value; autoCacheChronicle();
    if (field === 'cue') { const isLink = value && value.match(/^https?:\/\//); if (!!wasLink !== !!isLink) { saveQuillContent(chId); renderChronicle(); } }
}

// Save Quill content before re-render
function saveQuillContent(chId) {
    if (_quillInstances[chId]) {
        const ch = _chronicleEntries.find(c => c.id === chId);
        if (ch) ch.text = _quillInstances[chId].root.innerHTML;
        delete _quillInstances[chId];
    }
}

function saveAllQuillContent() {
    for (const id of Object.keys(_quillInstances)) saveQuillContent(id);
}

// ========== IMPORT UPDATE CHECK ==========
async function checkImportUpdates() {
    const imported = _chronicleEntries.filter(ch => ch._imported?.community_id);
    if (!imported.length) return;
    const ids = imported.map(ch => ch._imported.community_id);
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from(TABLE_COMMUNITY_CHAPTERS)
        .select('id, version')
        .in('id', ids);
    if (!data) return;
    _importUpdates = {};
    data.forEach(row => {
        const local = imported.find(ch => ch._imported.community_id === row.id);
        if (local && row.version > local._imported.version && _dismissedUpdates[row.id] !== row.version) {
            _importUpdates[row.id] = row.version;
        }
    });
    if (Object.keys(_importUpdates).length) renderChronicle();
}

function dismissUpdate(communityId) {
    _dismissedUpdates[communityId] = _importUpdates[communityId] || 999;
    delete _importUpdates[communityId];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(_dismissedUpdates));
    renderChronicle();
}

// ========== DRAG & DROP ==========
let chDraggedId = null;
function onChDragStart(e, id) { chDraggedId = id; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; }
function onChDragEnd(e) { e.target.style.opacity = ''; chDraggedId = null; }
function onChDrop(e, targetId) {
    e.preventDefault(); if (!chDraggedId || chDraggedId === targetId) return;
    const fromIdx = _chronicleEntries.findIndex(c => c.id === chDraggedId), toIdx = _chronicleEntries.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = _chronicleEntries.splice(fromIdx, 1); _chronicleEntries.splice(toIdx, 0, moved);
    saveAllQuillContent(); autoCacheChronicle(); renderChronicle();
}

// ========== QUILL SETUP ==========
const QUILL_TOOLBAR = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'link'],
    ['clean']
];

function initQuillEditor(chId, content) {
    const container = document.getElementById('editor-' + chId);
    if (!container || _quillInstances[chId]) return;
    const quill = new Quill(container, {
        theme: 'snow',
        placeholder: 'Write your notes here...',
        modules: { toolbar: QUILL_TOOLBAR }
    });
    if (content) quill.root.innerHTML = content;
    let debounce = null;
    quill.on('text-change', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            const ch = _chronicleEntries.find(c => c.id === chId);
            if (ch) { ch.text = quill.root.innerHTML; autoCacheChronicle(); }
        }, 500);
    });
    _quillInstances[chId] = quill;
}

// ========== RENDER HELPERS ==========
function renderNpcRows(ch) {
    return (ch.npcs || []).map((npc, i) => `<div class="grid grid-cols-[auto_auto_auto_1fr_auto] gap-2 items-center">
        <input value="${escHtmlAttr(npc.name)}" oninput="window._updateChapterNpc('${ch.id}', ${i}, 'name', this.value)" placeholder="Name" class="input-compact text-left px-2">
        <input value="${escHtmlAttr(npc.faction)}" oninput="window._updateChapterNpc('${ch.id}', ${i}, 'faction', this.value)" placeholder="Faction" class="input-compact text-left px-2">
        <select onchange="window._updateChapterNpc('${ch.id}', ${i}, 'disposition', this.value)" class="input-compact cursor-pointer ${npc.disposition === 'Friendly' ? 'text-green-400' : npc.disposition === 'Hostile' ? 'text-red-400' : npc.disposition === 'Neutral' ? 'text-amber-400' : 'text-zinc-600'}">
            <option value="" ${!npc.disposition ? 'selected' : ''}>Disposition</option>
            <option value="Friendly" ${npc.disposition === 'Friendly' ? 'selected' : ''}>Friendly</option>
            <option value="Neutral" ${npc.disposition === 'Neutral' ? 'selected' : ''}>Neutral</option>
            <option value="Hostile" ${npc.disposition === 'Hostile' ? 'selected' : ''}>Hostile</option>
        </select>
        <input value="${escHtmlAttr(npc.notes)}" oninput="window._updateChapterNpc('${ch.id}', ${i}, 'notes', this.value)" placeholder="Notes" class="input-compact text-left px-2">
        <button onclick="window._removeChapterNpc('${ch.id}', ${i})" class="btn-remove text-xs">✕</button>
    </div>`).join('');
}

function renderMusicRows(ch) {
    const music = ch.music || [];
    if (music.length === 0) return '';
    return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">' + music.map((m, i) => `<div class="grid grid-cols-[auto_1fr_1fr_auto] gap-1.5 items-center">
        ${m.cue && m.cue.match(/^https?:\/\//) ? `<a href="${escHtmlAttr(m.cue)}" target="_blank" rel="noopener" class="text-[#d4a017] hover:text-amber-300 text-sm leading-none" title="Open link">🔗</a>` : '<span class="w-4"></span>'}
        <input value="${escHtmlAttr(m.scene)}" oninput="window._updateChapterMusic('${ch.id}', ${i}, 'scene', this.value)" placeholder="Scene" class="input-compact text-left px-2">
        <input value="${escHtmlAttr(m.cue)}" oninput="window._updateChapterMusic('${ch.id}', ${i}, 'cue', this.value)" placeholder="Link or text" class="input-compact text-left px-2">
        <button onclick="window._removeChapterMusic('${ch.id}', ${i})" class="btn-remove text-xs">✕</button>
    </div>`).join('') + '</div>';
}

// ========== RENDER ==========
export function renderChronicle() {
    const list = document.getElementById('chronicleList');
    if (_chronicleEntries.length === 0) {
        list.innerHTML = '<div class="text-center py-20"><div class="text-zinc-600 text-sm italic">No chapters yet. Click "+ Chapter" to start your chronicle.</div></div>';
        return;
    }
    // Clear old instances
    for (const id of Object.keys(_quillInstances)) {
        if (!_chronicleEntries.find(c => c.id === id)) delete _quillInstances[id];
    }

    list.innerHTML = _chronicleEntries.map(ch => {
        const npcs = ch.npcs || [], music = ch.music || [];
        const hasUpdate = ch._imported?.community_id && _importUpdates[ch._imported.community_id];
        return `<div id="${ch.id}" class="fear-pool p-4 rounded-xl border ${hasUpdate ? 'border-amber-700/60' : 'border-[#3d362a]'} bg-[#1e1b16]" draggable="true">
            <div class="section-divider flex items-center gap-2 mb-3 pb-2 border-b border-[#3d362a] cursor-pointer select-none" onclick="window._toggleEntry('${ch.id}')">
                <span class="text-[10px] text-zinc-600 transition-transform ${ch.open ? 'rotate-90' : ''}">▶</span>
                <input value="${escHtmlAttr(ch.title)}" onclick="event.stopPropagation()" oninput="window._updateEntryTitle('${ch.id}', this.value)" class="flex-1 bg-transparent section-header font-[Cinzel] text-xs uppercase tracking-widest text-zinc-500 outline-none border-b border-transparent focus:border-[#d4a017] placeholder-zinc-700" placeholder="Chapter title...">
                ${hasUpdate ? `<button onclick="event.stopPropagation(); window._dismissUpdate('${ch._imported.community_id}')" class="text-[9px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase hover:bg-amber-900/60 transition-colors" title="Dismiss — check Community for the update">Update available ✕</button>` : ''}
                <button onclick="event.stopPropagation(); window._shareEntry('${ch.id}')" class="text-[10px] text-zinc-600 hover:text-[#d4a017] transition-colors" title="Share to Community">🌐</button>
                <button onclick="event.stopPropagation(); window._removeEntry('${ch.id}')" class="btn-remove" title="Remove">✕</button>
            </div>
            <div class="${ch.open ? '' : 'hidden'} space-y-4">
                <div id="editor-${ch.id}" class="chronicle-editor"></div>
                ${npcs.length ? `<div><div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">🧑 NPCs & Factions</div><div class="space-y-1">${renderNpcRows(ch)}</div></div>` : ''}
                ${music.length ? `<div><div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">🎵 Music Cues</div><div class="space-y-1">${renderMusicRows(ch)}</div></div>` : ''}
                <div class="flex gap-2 pt-1">
                    <button onclick="window._addChapterNpc('${ch.id}')" class="btn-outline">+ NPC</button>
                    <button onclick="window._addChapterMusic('${ch.id}')" class="btn-outline">+ Music Cue</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Initialize Quill editors for open chapters
    _chronicleEntries.forEach(ch => {
        if (ch.open) initQuillEditor(ch.id, ch.text);
    });

    // Bind drag events
    _chronicleEntries.forEach(ch => {
        const el = document.getElementById(ch.id);
        if (!el) return;
        el.ondragstart = (e) => onChDragStart(e, ch.id);
        el.ondragend = onChDragEnd;
        el.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
        el.ondragenter = () => { if (ch.id !== chDraggedId) el.classList.add('drag-over'); };
        el.ondragleave = () => el.classList.remove('drag-over');
        el.ondrop = (e) => onChDrop(e, ch.id);
    });
}

export function clearChronicle(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    showConfirm('Clear all chapters? This cannot be undone.', () => {
        Object.keys(_quillInstances).forEach(id => delete _quillInstances[id]);
        _chronicleEntries = []; autoCacheChronicle(); renderChronicle();
    });
}

// ========== SHARE TO COMMUNITY ==========
let _shareChapterId = null;

function validateShareForm() {
    const title = document.getElementById('shareTitle').value.trim();
    const desc = document.getElementById('shareDescription').value.trim();
    const env = document.getElementById('shareEnvironment').value;
    const diff = document.getElementById('shareDifficulty').value;
    const dur = document.getElementById('shareDuration').value;
    const consent = document.getElementById('shareConsent').checked;
    const valid = title && desc && desc.split(/\s+/).length >= 3 && env && diff && dur && consent;
    const btn = document.getElementById('shareSubmitBtn');
    btn.disabled = !valid;
    btn.classList.toggle('opacity-40', !valid);
    btn.classList.toggle('cursor-not-allowed', !valid);
}

function openShareModal(id) {
    if (!getUser()) { showAlert('Sign in to share chapters.'); return; }
    const ch = _chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    if (_quillInstances[id]) ch.text = _quillInstances[id].root.innerHTML;
    _shareChapterId = id;
    document.getElementById('shareTitle').value = ch.title || '';
    document.getElementById('shareDescription').value = '';
    document.getElementById('shareLevelMin').value = 1;
    document.getElementById('shareLevelMax').value = 5;
    document.getElementById('sharePartyMin').value = 3;
    document.getElementById('sharePartyMax').value = 5;
    document.getElementById('shareEnvironment').value = '';
    document.getElementById('shareDifficulty').value = '';
    document.getElementById('shareDuration').value = '';
    document.getElementById('shareChapterModal').classList.remove('hidden');
    document.getElementById('shareConsent').checked = false;
    validateShareForm();
    ['shareTitle', 'shareDescription', 'shareEnvironment', 'shareDifficulty', 'shareDuration', 'shareConsent'].forEach(id => {
        const el = document.getElementById(id);
        el.oninput = validateShareForm;
        el.onchange = validateShareForm;
    });
}

function closeShareModal() {
    document.getElementById('shareChapterModal').classList.add('hidden');
    _shareChapterId = null;
}

async function submitShare() {
    const ch = _chronicleEntries.find(c => c.id === _shareChapterId);
    if (!ch || !getUser()) return;
    const title = document.getElementById('shareTitle').value.trim();
    const description = document.getElementById('shareDescription').value.trim();
    const environment = document.getElementById('shareEnvironment').value;
    const difficulty = document.getElementById('shareDifficulty').value;
    const duration = document.getElementById('shareDuration').value;
    if (!title || !description || description.split(/\s+/).length < 3 || !environment || !difficulty || !duration) { showAlert('Please fill in all fields. Description needs at least 3 words.'); return; }
    // Duplicate check: same author + same title
    const { data: existing } = await getSupabase().from(TABLE_COMMUNITY_CHAPTERS)
        .select('id').eq('author_id', getUser().id).eq('title', title).limit(1);
    if (existing && existing.length > 0) {
        showAlert('You already shared a chapter with this title. Use a different title or edit it from Community \u2192 My Shares.');
        return;
    }
    const profile = getProfile();
    const row = {
        author_id: getUser().id,
        author_nickname: profile?.nickname || getUser().user_metadata?.full_name || getUser().email?.split('@')[0] || 'Unknown',
        title,
        content: { text: ch.text || '', npcs: ch.npcs || [], music: ch.music || [] },
        description,
        level_min: parseInt(document.getElementById('shareLevelMin').value) || 1,
        level_max: parseInt(document.getElementById('shareLevelMax').value) || 5,
        party_size_min: parseInt(document.getElementById('sharePartyMin').value) || 3,
        party_size_max: parseInt(document.getElementById('sharePartyMax').value) || 5,
        environment,
        difficulty,
        duration
    };
    const { data: inserted, error } = await getSupabase().from(TABLE_COMMUNITY_CHAPTERS).insert(row).select('id').single();
    if (error) { showAlert('Share failed: ' + error.message); return; }
    // Stamp local entry so we can link it
    if (inserted) ch._shared = { community_id: inserted.id };
    autoCacheChronicle();
    closeShareModal();
    showAlert('Chapter shared to the community!');
}

// ========== WINDOW BINDINGS ==========
window.addEntry = addEntry;
window.clearChronicle = clearChronicle;
window._toggleEntry = toggleEntry;
window._removeEntry = removeEntry;
window._updateEntryTitle = updateEntryTitle;
window._updateEntryText = updateEntryText;
window._addChapterNpc = addChapterNpc;
window._removeChapterNpc = removeChapterNpc;
window._updateChapterNpc = updateChapterNpc;
window._shareEntry = openShareModal;
window.closeShareChapter = closeShareModal;
window.submitShareChapter = submitShare;
window._dismissUpdate = dismissUpdate;
window._addChapterMusic = addChapterMusic;
window._removeChapterMusic = removeChapterMusic;
window._updateChapterMusic = updateChapterMusic;
