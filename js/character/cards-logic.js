import { escHtmlAttr, escHtml } from '../core/utils.js';

export function t(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val['en-US']) return val['en-US'];
    return String(val);
}

export function domainColor(domain, DOMAIN_COLORS) {
    return DOMAIN_COLORS[domain] || { text: '#a1a1aa', border: '#3f3f46', bg: '#3f3f4620' };
}

export function parseDesc(descArr) {
    if (!Array.isArray(descArr)) return t(descArr) || '';
    return descArr.map(d => {
        if (d.paragraph) return `<p>${t(d.paragraph)}</p>`;
        if (d.list) return d.list.map(li => `<p>• ${t(li)}</p>`).join('');
        return t(d);
    }).filter(Boolean).join('');
}

export function parseItem(item) {
    const name = t(item.name) || t(item.title) || 'Unnamed Card';
    let desc = parseDesc(item.description) || t(item.text) || t(item.ability) || t(item.effect) || '';
    let feature = '';
    if (Array.isArray(item.features) && item.features.length) {
        feature = item.features.map(f => {
            const fn = t(f.name);
            const fd = parseDesc(f.description);
            if (fn) return `<div class="text-[11px] font-bold text-amber-400 mt-1">${fn}</div><div class="text-[11px] text-zinc-400 leading-relaxed">${fd}</div>`;
            return `<div class="text-[11px] text-zinc-400 leading-relaxed">${fd}</div>`;
        }).join('');
    }
    return { name, desc, feature };
}

export { escHtmlAttr as escAttr } from '../core/utils.js';

export function buildFeatureHtml(features) {
    return features.filter(f => f.name || f.text).map(f =>
        `<div class="text-[11px] font-bold text-amber-400 mt-1">${escHtml(f.name)}</div><div class="text-[11px] text-zinc-400 leading-relaxed">${escHtml(f.text)}</div>`
    ).join('');
}

export function validateShareFields(title, desc, consent) {
    const descOk = desc.split(/\s+/).filter(Boolean).length >= 3;
    return !!(title && descOk && consent);
}

export function validateDomainCardFields(fields) {
    return !!(fields.name && fields.domain && fields.type && fields.level && fields.recall);
}

export function validateGeneralCardFields(fields) {
    return !!(fields.category && fields.name);
}

export function cardSortComparator(selectedSet, a, b) {
    const aSelected = selectedSet.has(a.name) ? 0 : 1;
    const bSelected = selectedSet.has(b.name) ? 0 : 1;
    if (aSelected !== bSelected) return aSelected - bSelected;
    return (a.level || 0) - (b.level || 0);
}

export function flattenClasses(data) {
    const flat = [];
    data.forEach(cls => {
        const clsName = cls.name || t(cls.name);
        const domains = (cls.domains || []).join(' / ');
        if (cls.hopeFeature) {
            flat.push({ _display: `${clsName} — Hope Feature`, name: cls.hopeFeature.name, features: [cls.hopeFeature], _classInfo: domains });
        }
        if (Array.isArray(cls.classFeatures)) {
            cls.classFeatures.forEach(f => {
                flat.push({ _display: `${clsName} — Class Feature`, name: f.name, features: [f], _classInfo: domains });
            });
        }
    });
    return flat;
}

export function flattenSubclasses(data) {
    const flat = [];
    data.forEach(sc => {
        const scName = t(sc.name);
        const cls = sc.class || '';
        ['foundation', 'specialization', 'mastery'].forEach(tier => {
            if (sc[tier] && Array.isArray(sc[tier].features)) {
                sc[tier].features.forEach(f => {
                    flat.push({ _display: `${scName} — ${tier.charAt(0).toUpperCase() + tier.slice(1)}`, name: f.name, features: [f], _tier: tier, _class: cls });
                });
            }
        });
    });
    return flat;
}
