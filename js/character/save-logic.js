export function buildExportFilename(charName, date) {
    return `${charName || 'character'}_${date}.json`;
}

export function migrateWeapons(fields) {
    const weapons = [];
    [1, 2].forEach(n => {
        const name = fields[`wep${n}_name`];
        if (name) weapons.push({ name, trait: fields[`wep${n}_trait`] || '', range: fields[`wep${n}_range`] || '', dmg: fields[`wep${n}_dmg`] || '', feature: fields[`wep${n}_feature`] || '', equipped: n === 1 });
    });
    return weapons;
}

export function migrateArmor(fields) {
    const name = fields['armor_name'];
    if (!name) return [];
    return [{ name, major: fields['armor_thresh_major'] || '0', severe: fields['armor_thresh_severe'] || '0', score: fields['armor_score'] || '', feature: fields['armor_feature'] || '', equipped: true }];
}

export const DEFAULT_RESET = {
    track_ev: '10',
    charLevel: '1',
    hp_max: '6',
    stress_max: '6',
    hope_max: '6',
    armor_max: '3',
    thresh_major_extra: '0',
    thresh_severe_extra: '0'
};
