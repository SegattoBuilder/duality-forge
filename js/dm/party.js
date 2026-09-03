import { getUser, getSupabase, escHtml, escHtmlAttr, showConfirm, showAlert } from '../core/auth.js';
import { TABLE_DM_TABLES, TABLE_CHARACTERS, LS_DM_TABLE_ID } from '../core/constants.js';

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
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_approved: true }).eq('id', characterId);
    if (error) { showAlert('Approve failed: ' + error.message); return; }
    await refreshMembers();
}

async function denyMember(characterId) {
    const sb = getSupabase();
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: null, table_approved: false }).eq('id', characterId);
    if (error) { showAlert('Deny failed: ' + error.message); return; }
    await refreshMembers();
}

async function kickMember(characterId) {
    const sb = getSupabase();
    const { error } = await sb.from(TABLE_CHARACTERS).update({ table_id: null, table_approved: false }).eq('id', characterId);
    if (error) { showAlert('Kick failed: ' + error.message); return; }
    await refreshMembers();
}

async function fetchMembers() {
    if (!currentTable) return [];
    const sb = getSupabase();
    const { data } = await sb.from(TABLE_CHARACTERS).select('id, character_name, data, updated_at, table_approved').eq('table_id', currentTable.id);
    return data || [];
}

// ========== RENDER ==========

async function refreshMembers() {
    const members = await fetchMembers();
    renderMemberList(members);
}

function renderMemberCard(m, actions) {
    const d = m.data || {};
    const f = d.fields || {};
    const name = escHtml(f.charName || m.character_name || 'Unnamed');
    const cls = escHtml(f.charClass || '—');
    const lvl = f.charLevel || '?';
    const hp = d.dots?.hp || [];
    const stress = d.dots?.stress || [];
    const hpFilled = hp.filter(Boolean).length;
    const hpMax = hp.length;
    const stressFilled = stress.filter(Boolean).length;
    const stressMax = stress.length;
    const updated = m.updated_at ? new Date(m.updated_at).toLocaleDateString() : '';
    return `<div class="p-4 rounded-xl border border-[#3d362a] bg-[#1e1b16] hover:border-[#d4a017] transition-colors">
        <div class="flex items-start justify-between mb-2">
            <div class="cursor-pointer flex-1" onclick="viewCharacterDetail('${m.id}')">
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${name}</div>
                <div class="text-[10px] text-zinc-500">${cls} · Lv ${escHtml(String(lvl))}</div>
            </div>
        </div>
        <div class="flex gap-3 text-[10px] mb-2">
            <span class="text-red-400">HP ${hpFilled}/${hpMax}</span>
            <span class="text-purple-400">Stress ${stressFilled}/${stressMax}</span>
        </div>
        <div class="flex justify-between items-center">
            <div class="flex gap-2">${actions}</div>
            <span class="text-[9px] text-zinc-600">${updated}</span>
        </div>
    </div>`;
}

function renderMemberList(members) {
    const list = document.getElementById('partyMemberList');
    if (!list) return;

    const approved = members.filter(m => m.table_approved);
    const pending = members.filter(m => !m.table_approved);

    let html = '';

    // Pending section
    if (pending.length) {
        html += `<div class="col-span-full"><div class="flex items-center gap-2 mb-3"><span class="text-[10px] text-yellow-500 uppercase tracking-wide font-bold font-[Cinzel]">⏳ Pending Approval</span><span class="text-[10px] text-zinc-600">(${pending.length})</span></div></div>`;
        html += pending.map(m => {
            const safeName = escHtmlAttr(m.data?.fields?.charName || m.character_name || 'this character');
            const actions = `<button onclick="approvePartyMember('${m.id}')" class="text-[10px] text-green-400 font-bold uppercase hover:underline">✓ Approve</button>
                <button onclick="denyPartyMember('${m.id}','${safeName}')" class="text-[10px] text-red-400 font-bold uppercase hover:underline">✕ Deny</button>
                <button onclick="viewCharacterDetail('${m.id}')" class="text-[10px] text-[#d4a017] font-bold uppercase hover:underline">View</button>`;
            return renderMemberCard(m, actions);
        }).join('');
    }

    // Approved section
    html += `<div class="col-span-full ${pending.length ? 'mt-4' : ''}"><div class="flex items-center gap-2 mb-3"><span class="text-[10px] text-green-400 uppercase tracking-wide font-bold font-[Cinzel]">✅ Party Members</span><span class="text-[10px] text-zinc-600">(${approved.length})</span></div></div>`;
    if (approved.length) {
        html += approved.map(m => {
            const safeName = escHtmlAttr(m.data?.fields?.charName || m.character_name || 'this character');
            const actions = `<button onclick="viewCharacterDetail('${m.id}')" class="text-[10px] text-[#d4a017] font-bold uppercase hover:underline">View Sheet</button>
                <button onclick="kickPartyMember('${m.id}','${safeName}')" class="text-red-400/50 hover:text-red-400 text-[10px] font-bold uppercase">Kick</button>`;
            return renderMemberCard(m, actions);
        }).join('');
    } else {
        html += '<div class="col-span-full text-center py-6 text-zinc-600 text-sm italic">No approved members yet.</div>';
    }

    list.innerHTML = html;
}

export async function renderParty() {
    const panel = document.getElementById('partyContent');
    if (!panel) return;
    const user = getUser();

    if (!user) {
        panel.innerHTML = `<div class="text-center py-20"><div class="text-zinc-600 text-sm italic mb-3">Sign in to use the Party system.</div><button onclick="openAuthModal()" class="btn-action text-xs px-6 py-2 rounded-full font-bold uppercase text-white">Sign In</button></div>`;
        return;
    }

    if (!currentTable) {
        await restoreCurrentTable();
    }

    if (!currentTable) {
        panel.innerHTML = `<div class="text-center py-20">
            <div class="text-4xl mb-4">👥</div>
            <div class="text-sm text-[#f5efe6] font-[Cinzel] font-bold mb-2">Party Not Set Up Yet</div>
            <div class="text-xs text-zinc-500 max-w-xs mx-auto">Save your campaign to the cloud and your unique table code will be generated for players to join.</div>
        </div>`;
        return;
    }

    const tableId = currentTable.id;
    panel.innerHTML = `
        <div class="mb-6 p-4 rounded-xl border border-[#3d362a] bg-[#1e1b16]">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${escHtml(currentTable.campaign_name)}</div>
                    <div class="text-[10px] text-zinc-500 mt-1">Share this code with your players:</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-black text-[#d4a017] tracking-wide select-all">${escHtml(tableId)}</span>
                    <button onclick="copyInviteCode()" class="text-xs text-zinc-400 hover:text-[#d4a017]" title="Copy code">📋</button>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="refreshPartyMembers()" class="bg-[#2a2418] border border-[#4a3f30] text-[10px] px-3 py-1.5 rounded-full font-bold uppercase text-[#d4a017] font-[Cinzel] hover:border-[#d4a017]">🔄 Refresh</button>
            </div>
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
    const d = row.data;
    const f = d.fields || {};
    const dots = d.dots || {};

    const renderDotStr = (arr, filledColor, emptyColor) => {
        if (!arr || !arr.length) return '<span class="text-zinc-600 text-[10px]">—</span>';
        return arr.map(v => `<span class="inline-block w-3 h-3 rounded-full ${v ? filledColor : emptyColor}"></span>`).join(' ');
    };

    const cardsHtml = (d.cards || []).map(c => {
        const domainBadge = c.domain ? `<span class="text-[9px] uppercase font-bold text-zinc-500">${escHtml(c.domain)}</span>` : '';
        const levelBadge = c.level ? `<span class="text-[9px] text-zinc-600">Lv${c.level}</span>` : '';
        const starred = (d.selectedDomain || []).map(s => s.toLowerCase()).includes((c.name || '').toLowerCase());
        return `<div class="p-3 rounded-lg border ${starred ? 'border-[#d4a017]/50 bg-[#d4a017]/5' : 'border-zinc-800 bg-black/20'}">
            <div class="flex items-center gap-2 mb-1">${starred ? '<span class="text-[#d4a017] text-xs">★</span>' : ''}<span class="text-xs font-bold text-[#f5efe6]">${escHtml(c.name)}</span></div>
            <div class="flex gap-2">${domainBadge}${levelBadge}</div>
            ${c.feature ? `<div class="text-[10px] text-zinc-400 mt-1 leading-relaxed char-detail-feature">${c.feature}</div>` : ''}
        </div>`;
    }).join('');

    const weaponsHtml = (d.weapons || []).map(w => {
        const eq = w.equipped ? '★ ' : '';
        return `<div class="flex items-center gap-2 text-xs"><span class="text-[#d4a017]">${eq}</span><span class="text-[#f5efe6] font-bold">${escHtml(w.name)}</span><span class="text-zinc-500">${escHtml(w.dmg || '')} ${escHtml(w.range || '')}</span></div>`;
    }).join('');

    const armorsHtml = (d.armors || []).map(a => {
        const eq = a.equipped ? '★ ' : '';
        return `<div class="flex items-center gap-2 text-xs"><span class="text-[#d4a017]">${eq}</span><span class="text-[#f5efe6] font-bold">${escHtml(a.name)}</span><span class="text-zinc-500">Major ${a.major || 0} / Severe ${a.severe || 0}</span></div>`;
    }).join('');

    const gearHtml = (d.gear || []).map(g => `<div class="text-xs"><span class="text-[#f5efe6] font-bold">${escHtml(g.name)}</span>${g.bonus ? ` <span class="text-[#d4a017]">${escHtml(g.bonus)}</span>` : ''}${g.desc ? `<div class="text-[10px] text-zinc-500">${escHtml(g.desc)}</div>` : ''}</div>`).join('');

    const itemsHtml = (d.items || []).map(i => `<div class="text-xs text-[#f5efe6]">${escHtml(typeof i === 'string' ? i : i.name)}</div>`).join('');
    const consumablesHtml = (d.consumables || []).map(c => `<div class="text-xs text-[#f5efe6]">${escHtml(typeof c === 'string' ? c : c.name)}</div>`).join('');

    const inventoryHtml = (d.inventory || []).map(i => {
        const name = typeof i === 'string' ? i : i.name;
        const qty = typeof i === 'string' ? '1' : (i.qty || '1');
        return `<div class="text-xs"><span class="text-zinc-500">${escHtml(qty)}×</span> <span class="text-[#f5efe6]">${escHtml(name)}</span></div>`;
    }).join('');

    const expHtml = (d.experience || []).map(e => `<div class="text-xs"><span class="text-[#f5efe6] font-bold">${escHtml(e.name)}</span> <span class="text-[#d4a017]">${escHtml(e.value || '')}</span>${e.desc ? `<div class="text-[10px] text-zinc-500">${escHtml(e.desc)}</div>` : ''}</div>`).join('');

    const section = (title, content) => content ? `<div class="mb-4"><div class="text-[10px] text-zinc-500 uppercase tracking-wide font-bold font-[Cinzel] mb-2">${title}</div>${content}</div>` : '';

    const body = document.getElementById('charDetailBody');
    body.innerHTML = `
        <div class="mb-4 pb-4 border-b border-[#3d362a]">
            <div class="text-lg font-black text-[#f5efe6] font-[Cinzel]">${escHtml(f.charName || row.character_name || 'Unnamed')}</div>
            <div class="text-xs text-zinc-500 mt-1">${escHtml(f.charPronouns || '')} · ${escHtml(f.charHeritage || '')} · ${escHtml(f.charClass || '')} · Lv ${escHtml(f.charLevel || '?')}</div>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 text-center">
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Agi</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_agi || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Str</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_str || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Fin</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_fin || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Inst</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_inst || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Pres</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_pres || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2"><div class="text-[9px] text-zinc-500 uppercase">Know</div><div class="text-sm font-bold text-[#f5efe6]">${escHtml(f.t_know || '0')}</div></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-[#14141c] border border-indigo-500/30 rounded-lg p-3 text-center"><div class="text-[9px] text-indigo-400 uppercase font-bold">Evasion</div><div class="text-lg font-black text-indigo-300">${escHtml(f.track_ev || '10')}</div></div>
            <div class="bg-[#14141c] border border-emerald-500/30 rounded-lg p-3 text-center"><div class="text-[9px] text-emerald-400 uppercase font-bold">Proficiency</div><div class="text-lg font-black text-emerald-300">${escHtml(f.track_prof || '0')}</div></div>
        </div>
        <div class="space-y-2 mb-4">
            <div class="flex items-center gap-3"><span class="text-xs font-bold text-red-400 w-14">HP</span><div class="flex flex-wrap gap-1">${renderDotStr(dots.hp, 'bg-red-500', 'bg-red-500/20')}</div></div>
            <div class="flex items-center gap-3"><span class="text-xs font-bold text-purple-400 w-14">Stress</span><div class="flex flex-wrap gap-1">${renderDotStr(dots.stress, 'bg-purple-500', 'bg-purple-500/20')}</div></div>
            <div class="flex items-center gap-3"><span class="text-xs font-bold text-yellow-500 w-14">Hope</span><div class="flex flex-wrap gap-1">${renderDotStr(dots.hope, 'bg-yellow-500', 'bg-yellow-500/20')}</div></div>
            <div class="flex items-center gap-3"><span class="text-xs font-bold text-blue-400 w-14">Armor</span><div class="flex flex-wrap gap-1">${renderDotStr(dots.armor, 'bg-blue-500', 'bg-blue-500/20')}</div></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-black/30 rounded-lg p-2 text-center"><div class="text-[9px] text-zinc-500 uppercase">Gold (Hand)</div><div class="text-sm font-bold text-[#d4a017]">${escHtml(f.gold_hand || '0')}</div></div>
            <div class="bg-black/30 rounded-lg p-2 text-center"><div class="text-[9px] text-zinc-500 uppercase">Gold (Bags)</div><div class="text-sm font-bold text-[#d4a017]">${escHtml(f.gold_bags || '0')}</div></div>
        </div>
        ${section('Weapons', weaponsHtml ? `<div class="space-y-1">${weaponsHtml}</div>` : '')}
        ${section('Armor', armorsHtml ? `<div class="space-y-1">${armorsHtml}</div>` : '')}
        ${section('Items', itemsHtml ? `<div class="space-y-1">${itemsHtml}</div>` : '')}
        ${section('Consumables', consumablesHtml ? `<div class="space-y-1">${consumablesHtml}</div>` : '')}
        ${section('Gear', gearHtml ? `<div class="space-y-2">${gearHtml}</div>` : '')}
        ${section('Inventory', inventoryHtml ? `<div class="space-y-1">${inventoryHtml}</div>` : '')}
        ${section('Experience', expHtml ? `<div class="space-y-2">${expHtml}</div>` : '')}
        ${section('Domain Cards', cardsHtml ? `<div class="space-y-2">${cardsHtml}</div>` : '')}
        ${section('Backstory', d.textareas?.backstory ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.backstory)}</div>` : '')}
        ${section('Connections', d.textareas?.connections ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.connections)}</div>` : '')}
        ${section('Level Up Notes', d.textareas?.levelupNotes ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.levelupNotes)}</div>` : '')}
        <div class="text-[9px] text-zinc-600 text-right mt-4">Last updated: ${row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</div>`;

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
    if (currentTable) navigator.clipboard.writeText(currentTable.id).catch(() => {});
};
