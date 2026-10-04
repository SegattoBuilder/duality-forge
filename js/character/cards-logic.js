
export function domainColor(domain, DOMAIN_COLORS) {
    return DOMAIN_COLORS[domain] || { text: '#a1a1aa', border: '#3f3f46', bg: '#3f3f4620' };
}

export { escHtmlAttr as escAttr } from '../core/utils.js';

export { validateShareFields } from '../core/utils.js';

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
