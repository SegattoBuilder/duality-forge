export function renderStars(avg) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= Math.round(avg) ? '★' : '☆';
    return `<span class="text-[#d4a017]">${s}</span>`;
}

export function parseFeatureText(rawText) {
    if (!rawText) return [];
    return rawText.split('\n').filter(l => l.trim()).map(line => {
        const ci = line.indexOf(':');
        return ci > 0 ? { name: line.slice(0, ci).trim(), text: line.slice(ci + 1).trim() } : { name: line.trim(), text: '' };
    });
}

export function filterChapters(chapters, { search, env, diff, dur, sort }) {
    let filtered = [...chapters];
    if (search) filtered = filtered.filter(c => c.title.toLowerCase().includes(search) || (c.author_nickname || '').toLowerCase().includes(search) || (c.description || '').toLowerCase().includes(search));
    if (env) filtered = filtered.filter(c => c.environment === env);
    if (diff) filtered = filtered.filter(c => c.difficulty === diff);
    if (dur) filtered = filtered.filter(c => c.duration === dur);
    if (sort === 'rating') filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (sort === 'popular') filtered.sort((a, b) => (b.import_count || 0) - (a.import_count || 0));
    return filtered;
}

export function filterAdversaries(adversaries, { search, type, tierMin = null, tierMax = null, diffMin = null, diffMax = null, sort } = {}) {
    let filtered = [...adversaries];
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

export function filterHomebrew(homebrews, { search, type, cat, domain, sort }) {
    let filtered = [...homebrews];
    if (search) filtered = filtered.filter(h => h.title.toLowerCase().includes(search) || (h.author_nickname || '').toLowerCase().includes(search) || (h.description || '').toLowerCase().includes(search));
    if (type) filtered = filtered.filter(h => h.card_type === type);
    if (cat) filtered = filtered.filter(h => h.card_category === cat);
    if (domain) filtered = filtered.filter(h => h.card_type === 'domain-card' && (h.card_data || {}).domain === domain);
    if (sort === 'rating') filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (sort === 'popular') filtered.sort((a, b) => (b.import_count || 0) - (a.import_count || 0));
    return filtered;
}
