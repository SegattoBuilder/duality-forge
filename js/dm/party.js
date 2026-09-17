import { getUser, getSupabase, showConfirm, showAlert } from '../core/auth.js';
import { escHtml, escHtmlAttr } from '../core/utils.js';
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
    const { data } = await sb.from(TABLE_CHARACTERS).select('id, character_name, data, updated_at, table_approved').eq('table_id', currentTable.id);
    return data || [];
}

// ========== RENDER ==========

async function refreshMembers() {
    const members = await fetchMembers();
    renderMemberList(members);
}

function renderMemberCard(m, isPending) {
    const d = m.data || {};
    const f = d.fields || {};
    const name = escHtml(f.charName || m.character_name || 'Unnamed');
    const cls = escHtml(f.charClass || '—');
    const lvl = f.charLevel || '?';
    const safeName = escHtmlAttr(f.charName || m.character_name || 'this character');

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
        const levels = approved.map(m => parseInt(m.data?.fields?.charLevel) || 1);
        const avgLvl = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1);
        const minLvl = Math.min(...levels);
        const maxLvl = Math.max(...levels);
        const avgN = parseFloat(avgLvl);
        const avgTier = avgN >= 8 ? 3 : avgN >= 5 ? 2 : avgN >= 2 ? 1 : 0;
        const classes = {};
        approved.forEach(m => { const c = m.data?.fields?.charClass || 'Unknown'; classes[c] = (classes[c] || 0) + 1; });
        const classStr = Object.entries(classes).map(([c, n]) => n > 1 ? `${n}× ${escHtml(c)}` : escHtml(c));

        html += `<div class="col-span-full mb-4 p-3 rounded-xl panel-box">
            <div class="flex items-center justify-between mb-2">
                <div class="text-[10px] uppercase tracking-wide font-bold font-[Cinzel]" style="color:var(--accent-1,#d4a017)">Party Summary</div>
                <button onclick="document.getElementById('partySummaryInfo').classList.toggle('hidden');this.textContent=this.textContent==='i'?'\u2715':'i'" class="info-btn" title="How is this calculated?">i</button>
            </div>
            <div id="partySummaryInfo" class="hidden mb-3 p-2 rounded-lg bg-black/30 border border-zinc-800 space-y-2 text-[10px] text-zinc-400">
                <div><span class="text-zinc-300 font-bold">Group Tier</span> matches the Tier of Play for the party's average level:</div>
                <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 ml-1">
                    <span class="text-zinc-500 font-bold">Tier 0</span><span>Lv 1 — Local heroes, low-level local threats</span>
                    <span class="text-zinc-500 font-bold">Tier 1</span><span>Lv 2–4 — Regional adventurers, wide-scale regional dangers</span>
                    <span class="text-zinc-500 font-bold">Tier 2</span><span>Lv 5–7 — Continental champions, world-shattering threats</span>
                    <span class="text-zinc-500 font-bold">Tier 3</span><span>Lv 8–10 — Mythic legends, gods and apocalyptic forces</span>
                </div>
                <div class="border-t border-zinc-800 pt-2 mt-1"><span class="text-zinc-300 font-bold">Difficulty Targets</span> — baseline Action Roll difficulties by tier:</div>
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
            <div class="flex flex-wrap gap-1.5">
                <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${approved.length} Player${approved.length !== 1 ? 's' : ''}</span>
                <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Avg Lv ${avgLvl}</span>
                <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Tier ${avgTier}</span>
                ${minLvl !== maxLvl ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Range Lv ${minLvl}–${maxLvl}</span>` : ''}
                ${classStr.map(c => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${c}</span>`).join('')}
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

const TIER_DEFS = [
    { key: 'tier2', label: 'Tier 2', levels: '2–4', options: [
        { ids: ['tier2_trait_1','tier2_trait_2','tier2_trait_3'], text: '+1 to two character traits' },
        { ids: ['tier2_hp_1','tier2_hp_2'], text: '+1 Hit Point slot' },
        { ids: ['tier2_stress_1','tier2_stress_2'], text: '+1 Stress slot' },
        { ids: ['tier2_exp'], text: '+1 to two Experiences' },
        { ids: ['tier2_domain'], text: 'Additional domain card' },
        { ids: ['tier2_evasion'], text: '+1 Evasion' }
    ]},
    { key: 'tier3', label: 'Tier 3', levels: '5–6', options: [
        { ids: ['tier3_trait_1','tier3_trait_2','tier3_trait_3'], text: '+1 to two character traits' },
        { ids: ['tier3_hp_1','tier3_hp_2'], text: '+1 Hit Point slot' },
        { ids: ['tier3_stress_1','tier3_stress_2'], text: '+1 Stress slot' },
        { ids: ['tier3_exp'], text: '+1 to two Experiences' },
        { ids: ['tier3_domain'], text: 'Additional domain card' },
        { ids: ['tier3_evasion'], text: '+1 Evasion' },
        { ids: ['tier3_subclass'], text: 'Subclass specialization' },
        { ids: ['tier3_prof_1','tier3_prof_2'], text: '+1 Proficiency' },
        { ids: ['tier3_multiclass_1','tier3_multiclass_2'], text: 'Multiclass option' }
    ]},
    { key: 'tier4', label: 'Tier 4', levels: '7–10', options: [
        { ids: ['tier4_trait_1','tier4_trait_2','tier4_trait_3'], text: '+1 to two character traits' },
        { ids: ['tier4_hp_1','tier4_hp_2'], text: '+1 Hit Point slot' },
        { ids: ['tier4_stress_1','tier4_stress_2'], text: '+1 Stress slot' },
        { ids: ['tier4_exp'], text: '+1 to two Experiences' },
        { ids: ['tier4_domain'], text: 'Additional domain card' },
        { ids: ['tier4_evasion'], text: '+1 Evasion' },
        { ids: ['tier4_subclass'], text: 'Subclass mastery' },
        { ids: ['tier4_prof_1','tier4_prof_2'], text: '+1 Proficiency' },
        { ids: ['tier4_multiclass_1','tier4_multiclass_2'], text: 'Multiclass option' }
    ]}
];

function buildTierCardsHtml(d) {
    return `<div class="grid grid-cols-1 gap-3 mb-4">${TIER_DEFS.map(t => {
        const data = d[t.key] || {};
        return `<div class="p-3 rounded-lg border border-zinc-800 bg-black/20">
            <div class="text-xs font-bold text-[#f5efe6] mb-2">${t.label} <span class="text-zinc-500 font-normal">(Lv ${t.levels})</span></div>
            <div class="space-y-1">${t.options.map(o => {
                const checked = o.ids.some(id => data[id]);
                const marks = o.ids.map(id => data[id] ? '☑' : '☐').join('');
                return `<div class="text-[11px] leading-relaxed ${checked ? 'text-zinc-400' : 'text-zinc-500'}"><span class="text-sm">${marks}</span> ${o.text}</div>`;
            }).join('')}</div>
        </div>`;
    }).join('')}</div>`;
}

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
        return `<div class="flex items-center gap-2 text-xs"><span class="text-[#d4a017]">${eq}</span><span class="text-[#f5efe6] ${w.equipped ? 'font-bold' : ''}">${escHtml(w.name)}</span><span class="text-zinc-500">${escHtml(w.dmg || '')} ${escHtml(w.range || '')}</span></div>`;
    }).join('');

    const armorsHtml = (d.armors || []).map(a => {
        const eq = a.equipped ? '★ ' : '';
        return `<div class="flex items-center gap-2 text-xs"><span class="text-[#d4a017]">${eq}</span><span class="text-[#f5efe6] ${a.equipped ? 'font-bold' : ''}">${escHtml(a.name)}</span><span class="text-zinc-500">Major ${a.major || 0} / Severe ${a.severe || 0}</span></div>`;
    }).join('');

    const gearHtml = (d.gear || []).map(g => `<div class="text-xs"><span class="text-[#f5efe6] font-bold">${escHtml(g.name)}</span>${g.bonus ? ` <span class="text-[#d4a017]">${escHtml(g.bonus)}</span>` : ''}${g.desc ? `<div class="text-[11px] text-zinc-400 leading-relaxed">${escHtml(g.desc)}</div>` : ''}</div>`).join('');

    const itemsHtml = (d.items || []).map(i => `<div class="text-xs text-[#f5efe6]">${escHtml(typeof i === 'string' ? i : i.name)}</div>`).join('');
    const consumablesHtml = (d.consumables || []).map(c => `<div class="text-xs text-[#f5efe6]">${escHtml(typeof c === 'string' ? c : c.name)}</div>`).join('');

    const inventoryHtml = (d.inventory || []).map(i => {
        const name = typeof i === 'string' ? i : i.name;
        const qty = typeof i === 'string' ? '1' : (i.qty || '1');
        return `<div class="text-xs"><span class="text-zinc-500">${escHtml(qty)}×</span> <span class="text-[#f5efe6]">${escHtml(name)}</span></div>`;
    }).join('');

    const expHtml = (d.experience || []).map(e => `<div class="text-xs"><span class="text-[#f5efe6] font-bold">${escHtml(e.name)}</span> <span class="text-[#d4a017]">${escHtml(e.value || '')}</span>${e.desc ? `<div class="text-[11px] text-zinc-400 leading-relaxed">${escHtml(e.desc)}</div>` : ''}</div>`).join('');

    const section = (title, content) => content ? `<div class="mb-4"><div class="text-[10px] uppercase tracking-wide font-bold font-[Cinzel] mb-2 pb-1 border-b" style="color:var(--accent-1,#d4a017);border-color:var(--accent-1,#d4a017)">${title}</div>${content}</div>` : '';

    const body = document.getElementById('charDetailBody');
    body.innerHTML = `
        <div class="mb-4 pb-4 border-b border-[#3d362a]">
            <div class="text-lg font-black text-[#f5efe6] font-[Cinzel]">${escHtml(f.charName || row.character_name || 'Unnamed')}</div>
            <div class="flex flex-wrap gap-1.5 mt-2">
                ${f.charPronouns ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(f.charPronouns)}</span>` : ''}
                ${f.charHeritage ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(f.charHeritage)}</span>` : ''}
                ${f.charClass ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(f.charClass)}</span>` : ''}
                <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">Lv ${escHtml(f.charLevel || '?')}</span>
            </div>
            ${(() => {
                const descs = [['Clothes', f.desc_clothes], ['Eyes', f.desc_eyes], ['Body', f.desc_body], ['Skin', f.desc_skin], ['Attitude', f.desc_attitude]].filter(([, v]) => v);
                return descs.length ? `<div class="text-[10px] text-zinc-600 mt-2">${descs.map(([k, v]) => `<span class="text-zinc-500">${k}:</span> ${escHtml(v)}`).join(' · ')}</div>` : '';
            })()}
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
        ${section('Tiers', buildTierCardsHtml(d))}
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
