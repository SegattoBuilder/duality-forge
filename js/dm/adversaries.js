import { escHtml, getNextName } from './app.js';
import { adversariesData, loadAdversaries, creatures, autoCache, renderGrid } from './tracker.js';

let advSearchTimeout = null;

export function initAdversariesTab() {
    if (adversariesData.length === 0) {
        loadAdversaries().then(() => { populateAdvTypeFilter(); document.getElementById('advStatus').textContent = `${adversariesData.length} adversaries loaded. Search by name or filter by difficulty.`; });
    } else {
        populateAdvTypeFilter();
        document.getElementById('advStatus').textContent = `${adversariesData.length} adversaries loaded. Search by name or filter by difficulty.`;
    }
    // Bind search inputs
    ['advSearch', 'advDiffMin', 'advDiffMax', 'advTierMin', 'advTierMax'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => { clearTimeout(advSearchTimeout); advSearchTimeout = setTimeout(runAdvSearch, 200); });
    });
    document.getElementById('advType').addEventListener('change', runAdvSearch);
}

function populateAdvTypeFilter() {
    const types = [...new Set(adversariesData.map(a => a.type).filter(Boolean))].sort();
    document.getElementById('advType').innerHTML = '<option value="">All</option>' + types.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
}

function runAdvSearch() {
    const query = document.getElementById('advSearch').value.trim().toLowerCase();
    const diffMin = document.getElementById('advDiffMin').value ? parseInt(document.getElementById('advDiffMin').value) : null;
    const diffMax = document.getElementById('advDiffMax').value ? parseInt(document.getElementById('advDiffMax').value) : null;
    const tierMin = document.getElementById('advTierMin').value ? parseInt(document.getElementById('advTierMin').value) : null;
    const tierMax = document.getElementById('advTierMax').value ? parseInt(document.getElementById('advTierMax').value) : null;
    const type = document.getElementById('advType').value;
    const statusEl = document.getElementById('advStatus'), resultsEl = document.getElementById('advResults');
    if (!query && diffMin === null && diffMax === null && tierMin === null && tierMax === null && !type) { resultsEl.innerHTML = ''; statusEl.textContent = `${adversariesData.length} adversaries loaded. Search by name or filter by difficulty.`; return; }
    let filtered = adversariesData;
    if (query) filtered = filtered.filter(a => a.name.toLowerCase().includes(query));
    if (diffMin !== null) filtered = filtered.filter(a => (parseInt(a.difficulty) || 0) >= diffMin);
    if (diffMax !== null) filtered = filtered.filter(a => (parseInt(a.difficulty) || 0) <= diffMax);
    if (tierMin !== null) filtered = filtered.filter(a => (parseInt(a.tier) || 0) >= tierMin);
    if (tierMax !== null) filtered = filtered.filter(a => (parseInt(a.tier) || 0) <= tierMax);
    if (type) filtered = filtered.filter(a => a.type === type);
    if (filtered.length === 0) { resultsEl.innerHTML = ''; statusEl.textContent = 'No adversaries found.'; return; }
    const limited = filtered.slice(0, 60);
    statusEl.textContent = filtered.length > 60 ? `Showing 60 of ${filtered.length} results.` : `${filtered.length} result${filtered.length > 1 ? 's' : ''}.`;
    resultsEl.innerHTML = limited.map(a => renderAdvCard(a)).join('');
}

function renderAdvCard(a) {
    const [major, severe] = (a.thresholds || '').split('/').map(s => s.trim());
    const features = a.feature || [];
    const idx = adversariesData.indexOf(a);
    return `<div class="creature-card" style="border-top-color: #e84040;">
        <div class="flex items-start justify-between mb-2"><span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(a.name)}</span><button onclick="window._addAdvToTracker(${idx}, event)" class="btn-outline text-[9px] px-2 py-1 whitespace-nowrap" title="Add to Tracker">+ Add</button></div>
        <div class="flex flex-wrap gap-1.5 mb-2">
            <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(a.type || '')} • T${escHtml(a.tier || '')}</span>
            <span class="text-[9px] bg-[#1a2a3b] border border-[#2a3d5a] rounded px-1.5 py-0.5 text-blue-300">Difficulty ${escHtml(a.difficulty || '')}</span>
            <span class="text-[9px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-300">HP ${escHtml(a.hp || '')}</span>
            ${a.stress && a.stress !== '0' ? `<span class="text-[9px] bg-[#2a1a2a] border border-[#3d2a3d] rounded px-1.5 py-0.5 text-purple-300">Stress ${escHtml(a.stress)}</span>` : ''}
            ${major ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Major ${escHtml(major)}+</span>` : ''}
            ${severe ? `<span class="text-[9px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-400">Severe ${escHtml(severe)}+</span>` : ''}
        </div>
        <div class="text-xs text-[#e8e0d4] mb-1">⚔️ <span class="font-bold">${escHtml(a.attack || '')}</span> ${escHtml(a.damage || '')} • ${escHtml(a.range || '')}</div>
        ${a.experience ? `<div class="text-xs text-[#e8e0d4] mb-1">📋 ${escHtml(a.experience)}</div>` : ''}
        ${a.motives_and_tactics ? `<div class="text-xs text-[#e8e0d4] mb-1">🎯 ${escHtml(a.motives_and_tactics)}</div>` : ''}
        ${a.ability ? `<div class="text-xs text-[#e8e0d4] mb-1">✨ ${escHtml(a.ability)}</div>` : ''}
        ${a.description ? `<div class="text-xs text-zinc-400 italic mb-1">${escHtml(a.description)}</div>` : ''}
        ${features.length ? `<div class="space-y-1 mt-2">${features.map(f => `<div><span class="text-[10px] font-bold text-amber-200">${escHtml(f.name || '')}</span> <span class="text-xs text-[#e8e0d4]">${escHtml(f.text || '')}</span></div>`).join('')}</div>` : ''}
    </div>`;
}

function addAdvToTracker(index, event) {
    const a = adversariesData[index]; if (!a) return;
    creatures().push({
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        name: getNextName(a.name),
        evasion: parseInt(a.difficulty) || 10,
        hpMax: parseInt(a.hp) || 1, hpFilled: parseInt(a.hp) || 1,
        stressMax: parseInt(a.stress) || 0, stressFilled: parseInt(a.stress) || 0,
        hopeMax: 0, hopeFilled: 0, armorMax: 0, armorFilled: 0,
        enemyData: a
    });
    autoCache(); renderGrid();
    const btn = event?.target;
    if (btn) {
        btn.textContent = '✓ Added';
        btn.classList.remove('text-[#d4a017]');
        btn.classList.add('text-green-400', 'border-green-600');
        setTimeout(() => { btn.textContent = '+ Add'; btn.classList.remove('text-green-400', 'border-green-600'); btn.classList.add('text-[#d4a017]'); }, 2000);
    }
}

function clearAdvSearch() {
    ['advSearch','advDiffMin','advDiffMax','advTierMin','advTierMax'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('advType').value = '';
    runAdvSearch();
}

window._addAdvToTracker = addAdvToTracker;
window.clearAdvSearch = clearAdvSearch;
