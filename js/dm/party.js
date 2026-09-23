import { getUser, getSupabase, showConfirm, showAlert } from '../core/auth.js';
import { escHtml, escHtmlAttr } from '../core/utils.js';
import { TABLE_DM_TABLES, TABLE_CHARACTERS, LS_DM_TABLE_ID } from '../core/constants.js';
import { renderCharacterDetailHtml } from '../core/character-detail.js';

let currentTable = null;

export function getCurrentTable() { return currentTable; }
export function setCurrentTable(t) {
    currentTable = t;
    if (t) localStorage.setItem(LS_DM_TABLE_ID, JSON.stringify(t));
    else localStorage.removeItem(LS_DM_TABLE_ID);
}

export async function restoreCurrentTable() {
    if (currentTable) return;
    const raw = localStorage.getItem(LS_DM_TABLE_ID);
    if (!raw) return;
    try { currentTable = JSON.parse(raw); } catch { /* ignore */ }
}

// ========== MEMBER ACTIONS ==========

async function approveMember(characterId) {
    const sb = getSupabase();
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_approved: 'true' }).eq('id', characterId);
    if (error) { showAlert('Approve failed: ' + error.message); return; }
    await refreshMembers();
}

async function denyMember(characterId) {
    const sb = getSupabase();
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_approved: 'denied' }).eq('id', characterId);
    if (error) { showAlert('Deny failed: ' + error.message); return; }
    await refreshMembers();
}

async function kickMember(characterId) {
    const sb = getSupabase();
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_approved: 'kicked' }).eq('id', characterId);
    if (error) { showAlert('Kick failed: ' + error.message); return; }
    await refreshMembers();
}

async function fetchMembers() {
    if (!currentTable) return [];
    const sb = getSupabase();
    const { data } = await sb.from(TABLE_CHARACTERS).select('id, character_name, class, level, updated_at, table_approved').eq('table_id', currentTable.id);
    return data || [];
}

// ========== RENDER ==========

async function refreshMembers() {
    const members = await fetchMembers();
    renderMemberList(members);
}

function renderMemberCard(m, isPending) {
    const name = escHtml(m.character_name || 'Unnamed');
    const cls = escHtml(m.class || '—');
    const lvl = m.level || '?';
    const safeName = escHtmlAttr(m.character_name || 'this character');

    const actionBtn = isPending
        ? `<div class="flex gap-1">
            <button onclick="event.stopPropagation(); approvePartyMember('${m.id}')" class="btn-approve" title="Approve">✓</button>
            <button onclick="event.stopPropagation(); denyPartyMember('${m.id}','${safeName}')" class="btn-deny" title="Deny">✕</button>
        </div>`
        : `<button onclick="event.stopPropagation(); kickPartyMember('${m.id}','${safeName}')" class="btn-deny btn-deny-dim" title="Kick">✕</button>`;

    return `<div class="option-card cursor-pointer" onclick="viewCharacterDetail('${m.id}')">
        <div class="flex items-start justify-between">
            <div>
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${name}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                    ${cls !== '—' ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${cls}</span>` : ''}
                    <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Lv ${escHtml(String(lvl))}</span>
                </div>
            </div>
            ${actionBtn}
        </div>
    </div>`;
}

function renderMemberList(members) {
    const list = document.getElementById('partyMemberList');
    if (!list) return;

    const active = members.filter(m => m.table_approved !== 'kicked' && m.table_approved !== 'denied');
    const approved = active.filter(m => m.table_approved === 'true');
    const pending = active.filter(m => m.table_approved !== 'true');

    let html = '';

    // Party summary
    if (approved.length) {
        const levels = approved.map(m => parseInt(m.level) || 1);
        const avgLvl = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1);
        const minLvl = Math.min(...levels);
        const maxLvl = Math.max(...levels);
        const avgN = parseFloat(avgLvl);
        const avgTier = avgN >= 8 ? 3 : avgN >= 5 ? 2 : avgN >= 2 ? 1 : 0;
        const diffTarget = avgTier >= 3 ? '20–25' : avgTier >= 2 ? '15–20' : '10–15';
        const classes = {};
        approved.forEach(m => { const c = m.class || 'Unknown'; classes[c] = (classes[c] || 0) + 1; });
        const classStr = Object.entries(classes).map(([c, n]) => n > 1 ? `${n}× ${escHtml(c)}` : escHtml(c));

        html += `<div class="col-span-full mb-4 p-3 rounded-xl panel-box">
            <div class="flex items-center justify-between mb-3">
                <div class="flex-1"></div>
                <div class="text-[10px] uppercase tracking-wide font-bold font-[Cinzel]" style="color:var(--accent-1,#d4a017)">Party Summary</div>
                <div class="flex-1 flex justify-end"><button onclick="document.getElementById('partySummaryInfo').classList.toggle('hidden');this.textContent=this.textContent==='i'?'\u2715':'i'" class="info-btn" title="How is this calculated?">i</button></div>
            </div>
            <div id="partySummaryInfo" class="hidden mb-3 p-2 rounded-lg bg-black/30 border border-zinc-800 space-y-2 text-[10px] text-zinc-400">
                <div><span class="text-zinc-300 font-bold">Group Tier</span> matches the Tier of Play for the party's average level:</div>
                <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 ml-1">
                    <span class="text-zinc-500 font-bold">Tier 0</span><span>Lv 1 — Local heroes, low-level local threats</span>
                    <span class="text-zinc-500 font-bold">Tier 1</span><span>Lv 2–4 — Regional adventurers, wide-scale regional dangers</span>
                    <span class="text-zinc-500 font-bold">Tier 2</span><span>Lv 5–7 — Continental champions, world-shattering threats</span>
                    <span class="text-zinc-500 font-bold">Tier 3</span><span>Lv 8–10 — Mythic legends, gods and apocalyptic forces</span>
                </div>
                <div class="border-t border-zinc-800 pt-2 mt-1"><span class="text-zinc-300 font-bold">Difficulty Targets (DC)</span> — baseline Action Roll difficulty by tier:</div>
                <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 ml-1">
                    <span class="text-zinc-500 font-bold">Tier 0–1</span><span>Standard checks around 10–15</span>
                    <span class="text-zinc-500 font-bold">Tier 2</span><span>Standard checks shift to 15–20</span>
                    <span class="text-zinc-500 font-bold">Tier 3</span><span>Hard checks frequently reach 20–25+</span>
                </div>
                <div class="border-t border-zinc-800 pt-2 mt-1">
                    <div><span class="text-zinc-300 font-bold">Avg Level:</span> (${levels.join(' + ')}) ÷ ${approved.length} = ${avgLvl}</div>
                    ${minLvl !== maxLvl ? `<div><span class="text-zinc-300 font-bold">Range:</span> Lv ${minLvl}–${maxLvl}. A wide range may affect encounter balance.</div>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                    <div class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold">Party</div>
                    <div class="flex flex-wrap gap-1">
                        <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${approved.length} Player${approved.length !== 1 ? 's' : ''}</span>
                        ${classStr.map(c => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${c}</span>`).join('')}
                    </div>
                </div>
                <div class="space-y-1.5">
                    <div class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold">Group</div>
                    <div class="flex flex-wrap gap-1">
                        <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Avg Lv ${avgLvl}</span>
                        <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Tier ${avgTier}</span>
                        <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">DC ${diffTarget}</span>
                        ${minLvl !== maxLvl ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Lv ${minLvl}–${maxLvl}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Approved section
    html += `<div class="col-span-full"><div class="flex items-center gap-2 mb-3"><span class="text-[10px] text-green-400 uppercase tracking-wide font-bold font-[Cinzel]">✅ Party Members</span><span class="text-[10px] text-zinc-600">(${approved.length})</span></div></div>`;
    if (approved.length) {
        html += approved.map(m => renderMemberCard(m, false)).join('');
    } else {
        html += '<div class="col-span-full text-center py-6 text-zinc-600 text-sm italic">No approved members yet.</div>';
    }

    // Pending section
    if (pending.length) {
        html += `<div class="col-span-full mt-4"><div class="flex items-center gap-2 mb-3"><span class="text-[10px] text-yellow-500 uppercase tracking-wide font-bold font-[Cinzel]">⏳ Pending Approval</span><span class="text-[10px] text-zinc-600">(${pending.length})</span></div></div>`;
        html += pending.map(m => renderMemberCard(m, true)).join('');
    }

    list.innerHTML = html;
}

export async function renderParty() {
    const panel = document.getElementById('partyContent');
    if (!panel) return;
    const user = getUser();

    if (!user) {
        panel.innerHTML = `<div class="text-center py-20 max-w-sm mx-auto">
            <img src="../images/logo/party-64.png" alt="" class="w-20 h-20 mx-auto mb-4">
            <div class="text-sm text-[#f5efe6] font-[Cinzel] font-bold mb-2">Party Requires an Account</div>
            <div class="text-xs text-zinc-500 mb-6 leading-relaxed">Sign in or create an account to manage your party. Share a table code with your players so they can join, and view their character sheets in real time.</div>
            <div class="flex gap-3 justify-center">
                <button onclick="openAuthModal()" class="btn-primary-pill text-xs px-6 py-2.5">Sign In / Sign Up</button>
            </div>
        </div>`;
        return;
    }

    if (!currentTable) {
        await restoreCurrentTable();
    }

    if (!currentTable) {
        panel.innerHTML = `<div class="text-center py-20">
            <img src="../images/logo/party-64.png" alt="" class="w-20 h-20 mx-auto mb-4">
            <div class="text-sm text-[#f5efe6] font-[Cinzel] font-bold mb-2">Party Not Set Up Yet</div>
            <div class="text-xs text-zinc-500 max-w-xs mx-auto">Save your campaign to the cloud and your unique table code will be generated for players to join.</div>
        </div>`;
        return;
    }

    const tableId = currentTable.id;
    panel.innerHTML = `
        <div class="mb-6 max-w-sm mx-auto p-3 rounded-xl panel-box text-center">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-2">Table Code</div>
            <div class="flex items-center justify-center gap-2 mb-2">
                <span class="font-mono text-[10px] font-bold text-[#d4a017] tracking-wide select-all">${escHtml(tableId)}</span>
                <button onclick="copyInviteCode()" class="btn-icon text-xs" title="Copy code">📋</button>
            </div>
            <div class="text-[10px] text-zinc-600 italic">Share with your players to join</div>
        </div>
        <div id="partyMemberList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="col-span-full text-center py-10 text-zinc-600 text-sm italic">Loading party...</div>
        </div>`;
    refreshMembers();
}

// ========== CHARACTER DETAIL ==========

async function showCharacterDetail(charId) {
    const sb = getSupabase();
    const { data: row } = await sb.from(TABLE_CHARACTERS).select('id, character_name, data, updated_at').eq('id', charId).single();
    if (!row || !row.data) { showAlert('Could not load character.'); return; }

    document.getElementById('charDetailBody').innerHTML = renderCharacterDetailHtml(row);
    document.getElementById('charDetailModal').classList.remove('hidden');
}

function closeCharDetail() {
    document.getElementById('charDetailModal').classList.add('hidden');
}

// ========== INIT ==========

export function initParty() {}

// ========== WINDOW BINDINGS ==========

window.refreshPartyMembers = refreshMembers;

window.approvePartyMember = (id) => approveMember(id);

window.denyPartyMember = (id, name) => {
    showConfirm(`Deny ${escHtml(name)}? They will be removed from the table.`, () => denyMember(id));
};

window.kickPartyMember = (id, name) => {
    showConfirm(`Kick ${escHtml(name)} from the table?`, () => kickMember(id));
};

window.viewCharacterDetail = (id) => showCharacterDetail(id);
window.closeCharDetail = closeCharDetail;

window.copyInviteCode = () => {
    if (!currentTable) return;
    navigator.clipboard.writeText(currentTable.id).then(() => {
        const btn = document.querySelector('[onclick="copyInviteCode()"]');
        if (!btn) return;
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = '📋', 1500);
    }).catch(() => {});
};
