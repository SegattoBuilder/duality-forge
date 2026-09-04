import { escHtml, escHtmlAttr } from './app.js';
import { showConfirm, getUser, getProfile, getSupabase, showAlert } from '../core/auth.js';
import { LS_DM_CHRONICLE, TABLE_COMMUNITY_CHAPTERS } from '../core/constants.js';
const CHRONICLE_KEY = LS_DM_CHRONICLE;
let _chronicleEntries = [];
const _quillInstances = {};

export function chronicleEntries() { return _chronicleEntries; }
export function setChronicleEntries(v) { _chronicleEntries = v; }

export function autoCacheChronicle() {
    localStorage.setItem(CHRONICLE_KEY, JSON.stringify(_chronicleEntries));
    if (typeof window._markCloudDirty === 'function') window._markCloudDirty();
}

export function initChronicle() {
    try { _chronicleEntries = JSON.parse(localStorage.getItem(CHRONICLE_KEY)) || []; } catch { _chronicleEntries = []; }
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
        return `<div id="${ch.id}" class="fear-pool p-4 rounded-xl border border-[#3d362a] bg-[#1e1b16]" draggable="true">
            <div class="section-divider flex items-center gap-2 mb-3 pb-2 border-b border-[#3d362a] cursor-pointer select-none" onclick="window._toggleEntry('${ch.id}')">
                <span class="text-[10px] text-zinc-600 transition-transform ${ch.open ? 'rotate-90' : ''}">▶</span>
                <input value="${escHtmlAttr(ch.title)}" onclick="event.stopPropagation()" oninput="window._updateEntryTitle('${ch.id}', this.value)" class="flex-1 bg-transparent section-header font-[Cinzel] text-xs uppercase tracking-widest text-zinc-500 outline-none border-b border-transparent focus:border-[#d4a017] placeholder-zinc-700" placeholder="Chapter title...">
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

function openShareModal(id) {
    if (!getUser()) { showAlert('Sign in to share chapters.'); return; }
    const ch = _chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    // Save latest Quill content
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
    const consent = document.getElementById('shareConsent');
    const btn = document.getElementById('shareSubmitBtn');
    consent.checked = false;
    btn.disabled = true;
    btn.classList.add('opacity-40', 'cursor-not-allowed');
    consent.onchange = () => {
        btn.disabled = !consent.checked;
        btn.classList.toggle('opacity-40', !consent.checked);
        btn.classList.toggle('cursor-not-allowed', !consent.checked);
    };
}

function closeShareModal() {
    document.getElementById('shareChapterModal').classList.add('hidden');
    _shareChapterId = null;
}

async function submitShare() {
    const ch = _chronicleEntries.find(c => c.id === _shareChapterId);
    if (!ch || !getUser()) return;
    const title = document.getElementById('shareTitle').value.trim();
    if (!title) { showAlert('Please enter a title.'); return; }
    const profile = getProfile();
    const row = {
        author_id: getUser().id,
        author_nickname: profile?.nickname || getUser().user_metadata?.full_name || getUser().email?.split('@')[0] || 'Unknown',
        title,
        content: { text: ch.text || '', npcs: ch.npcs || [], music: ch.music || [] },
        description: document.getElementById('shareDescription').value.trim() || null,
        level_min: parseInt(document.getElementById('shareLevelMin').value) || 1,
        level_max: parseInt(document.getElementById('shareLevelMax').value) || 5,
        party_size_min: parseInt(document.getElementById('sharePartyMin').value) || 3,
        party_size_max: parseInt(document.getElementById('sharePartyMax').value) || 5,
        environment: document.getElementById('shareEnvironment').value || null,
        difficulty: document.getElementById('shareDifficulty').value || null,
        duration: document.getElementById('shareDuration').value || null
    };
    const { error } = await getSupabase().from(TABLE_COMMUNITY_CHAPTERS).insert(row);
    if (error) { showAlert('Share failed: ' + error.message); return; }
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
window._addChapterMusic = addChapterMusic;
window._removeChapterMusic = removeChapterMusic;
window._updateChapterMusic = updateChapterMusic;
