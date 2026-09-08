export const TRAIT_OPTIONS = '<option value="">—</option><option value="t_agi">Agility</option><option value="t_str">Strength</option><option value="t_fin">Finesse</option><option value="t_inst">Instinct</option><option value="t_pres">Presence</option><option value="t_know">Knowledge</option>';

export function resolveEquipped(explicitValue, isFirstItem) {
    return explicitValue !== undefined ? explicitValue : isFirstItem;
}

export function equipStar(equipped) {
    return equipped ? '★' : '☆';
}

export function equipOpacity(equipped) {
    return equipped ? '1' : '0.4';
}

export function normalizeGearInput(data) {
    const d = data || {};
    return {
        name: d.name || '',
        range: d.range || '',
        dmg: d.dmg || '',
        feature: d.feature || '',
        trait: d.trait || '',
        major: d.major || '0',
        severe: d.severe || '0',
        score: d.score || '',
        qty: d.qty || '1',
        desc: d.desc || '',
        bonus: d.bonus || '',
        collapsed: d.collapsed || false
    };
}
