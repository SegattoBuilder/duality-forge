import { escHtml } from './utils.js';

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

export function renderCharacterDetailHtml(row) {
    const d = row.data || {};
    const f = d.fields || {};
    const dots = d.dots || {};

    const renderDotStr = (arr, filledColor, emptyColor) => {
        if (!arr || !arr.length) return '<span class="text-zinc-600 text-[10px]">—</span>';
        return arr.map(v => `<span class="inline-block w-3 h-3 rounded-full ${v ? filledColor : emptyColor}"></span>`).join(' ');
    };

    const allCards = d.cards || [];
    const selectedNames = (d.selectedDomain || []).map(s => s.toLowerCase());

    const renderCard = (c) => {
        const domainBadge = c.domain ? `<span class="text-[9px] uppercase font-bold text-zinc-500">${escHtml(c.domain)}</span>` : '';
        const levelBadge = c.level ? `<span class="text-[9px] text-zinc-600">Lv${c.level}</span>` : '';
        const starred = selectedNames.includes((c.name || '').toLowerCase());
        return `<div class="p-3 rounded-lg border ${starred ? 'border-[#d4a017]/50 bg-[#d4a017]/5' : 'border-zinc-800 bg-black/20'}">
            <div class="flex items-center gap-2 mb-1">${starred ? '<span class="text-[#d4a017] text-xs">★</span>' : ''}<span class="text-xs font-bold text-[#f5efe6]">${escHtml(c.name)}</span></div>
            <div class="flex gap-2">${domainBadge}${levelBadge}</div>
            ${c.feature ? `<div class="text-[10px] text-zinc-400 mt-1 leading-relaxed char-detail-feature">${c.feature}</div>` : ''}
        </div>`;
    };

    const domainCards = allCards.filter(c => c.category === 'domain-cards.json');
    const generalCards = allCards.filter(c => c.category !== 'domain-cards.json');
    const sortedDomain = [...domainCards].sort((a, b) => {
        const aS = selectedNames.includes((a.name || '').toLowerCase()) ? 0 : 1;
        const bS = selectedNames.includes((b.name || '').toLowerCase()) ? 0 : 1;
        return aS - bS;
    });
    const domainHtml = sortedDomain.map(renderCard).join('');
    const generalHtml = generalCards.map(renderCard).join('');

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

    return `
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
        ${section('Domain Cards', domainHtml ? `<div class="space-y-2">${domainHtml}</div>` : '')}
        ${section('General Cards', generalHtml ? `<div class="space-y-2">${generalHtml}</div>` : '')}
        ${section('Tiers', buildTierCardsHtml(d))}
        ${section('Backstory', d.textareas?.backstory ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.backstory)}</div>` : '')}
        ${section('Connections', d.textareas?.connections ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.connections)}</div>` : '')}
        ${section('Level Up Notes', d.textareas?.levelupNotes ? `<div class="text-xs text-zinc-300 whitespace-pre-wrap">${escHtml(d.textareas.levelupNotes)}</div>` : '')}
        <div class="text-[9px] text-zinc-600 text-right mt-4">Last updated: ${row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</div>`;
}
