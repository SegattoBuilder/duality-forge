import { escHtml } from './utils.js';

export function renderTableDetailHtml(row) {
    const d = row.data || {};
    const name = d.campaign || row.campaign_name || 'Unnamed';
    const vault = d.vaultCreatures || [];
    const chapters = d.chronicleEntries || [];
    const party = d.partyMembers || [];

    const section = (title, content) => content
        ? `<div class="mb-4"><div class="text-[10px] uppercase tracking-wide font-bold font-[Cinzel] mb-2 pb-1 border-b" style="color:var(--accent-1,#d4a017);border-color:var(--accent-1,#d4a017)">${title}</div>${content}</div>`
        : '';

    let partyHtml = '';
    if (party.length) {
        partyHtml = `<div class="space-y-2">${party.map(m => {
            const cls = m.class ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(m.class)}</span>` : '';
            const lvl = m.level ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">Lv ${escHtml(String(m.level))}</span>` : '';
            return `<div class="flex items-center gap-2"><span class="text-xs">🗡️</span><span class="text-xs font-bold text-[#f5efe6]">${escHtml(m.name)}</span>${cls}${lvl}</div>`;
        }).join('')}</div>`;
    } else {
        partyHtml = `<div class="text-[10px] text-zinc-500 italic">No party data available.</div>`;
    }

    let chaptersHtml = '';
    if (chapters.length) {
        chaptersHtml = `<div class="space-y-2">${chapters.map(ch => {
            const title = escHtml(ch.title || 'Untitled');
            const npcCount = ch.npcs?.length || 0;
            const hasMusic = ch.music?.length > 0;
            return `<div class="p-3 rounded-lg border border-zinc-800 bg-black/20"><div class="text-xs font-bold text-[#f5efe6]">${title}</div><div class="flex gap-2 mt-1">${npcCount ? `<span class="text-[9px] text-zinc-400">${npcCount} NPC${npcCount !== 1 ? 's' : ''}</span>` : ''}${hasMusic ? '<span class="text-[9px] text-zinc-400">🎵</span>' : ''}</div></div>`;
        }).join('')}</div>`;
    }

    let vaultHtml = '';
    if (vault.length) {
        vaultHtml = `<div class="space-y-1">${vault.map(c => {
            const cName = escHtml(c.name || 'Unnamed');
            const tier = c.enemyData?.tier || c.tier;
            const type = c.enemyData?.type || c.type || '';
            return `<div class="flex items-center gap-2 text-xs"><span class="text-zinc-400">👹</span><span class="text-[#f5efe6] font-bold">${cName}</span>${type ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(type)}</span>` : ''}${tier ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">T${tier}</span>` : ''}</div>`;
        }).join('')}</div>`;
    }

    return `
        <div class="mb-4 pb-4 border-b border-[#3d362a]">
            <div class="text-lg font-black text-[#f5efe6] font-[Cinzel]">${escHtml(name)}</div>
            <div class="flex flex-wrap gap-1.5 mt-2">
                ${d.creatures?.length ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${d.creatures.length} ⚔ Tracker</span>` : ''}
                ${vault.length ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${vault.length} 📦 Vault</span>` : ''}
                ${chapters.length ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${chapters.length} 📜 Chapters</span>` : ''}
                ${party.length ? `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${party.length} 🗡️ Party</span>` : ''}
            </div>
        </div>
        ${section('Party', partyHtml)}
        ${section('Chronicle', chaptersHtml)}
        ${section('Vault', vaultHtml)}
        <div class="text-[9px] text-zinc-600 text-right mt-4">Last updated: ${row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</div>`;
}
