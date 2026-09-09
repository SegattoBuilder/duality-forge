import { generateId } from '../core/utils.js';

export function createCounter() {
    return { id: generateId('ac'), label: 'Action Counter', value: 0 };
}

export function clampCounterValue(current, delta) {
    return Math.max(0, Math.min(100, current + delta));
}

export function computeFearToggle(index, currentFilled) {
    return index < currentFilled ? index : index + 1;
}

export function searchEnemies(query, data) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return data.filter(a => a.name.toLowerCase().includes(q)).slice(0, 10);
}

export function parseFeatures(rawText) {
    if (!rawText) return [];
    return rawText.split('\n').filter(l => l.trim()).map(line => {
        const ci = line.indexOf(':');
        return ci > -1 ? { name: line.slice(0, ci).trim(), text: line.slice(ci + 1).trim() } : { name: line.trim(), text: '' };
    });
}

export function buildThresholds(major, severe) {
    return (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
}

export function clampQty(val) {
    return Math.max(1, Math.min(20, parseInt(val) || 1));
}

export function isCreatureDead(creature) {
    return creature.hpFilled <= 0;
}

export { computeDotToggle } from '../core/utils.js';

export function adjustMaxValue(currentMax, currentFilled, delta) {
    const newMax = (currentMax || 0) + delta;
    if (newMax < 0 || newMax > 30) return null;
    let newFilled = currentFilled;
    if (newFilled > newMax) newFilled = newMax;
    if (delta > 0) newFilled = Math.min((currentFilled || 0) + 1, newMax);
    return { max: newMax, filled: newFilled };
}

export function clampEvasion(current, delta) {
    return Math.max(0, Math.min(30, (current || 0) + delta));
}

export function enemyDataToAttacks(ed) {
    if (ed.attacks && ed.attacks.length) return ed.attacks;
    if (ed.attack || ed.damage) return [{ name: ed.attack || '', atk: ed.atk || '', damage: ed.damage || '', range: ed.range || '' }];
    return [];
}

export function buildEnemyData(params) {
    const { name, difficulty, hp, stress, major, severe, attacks, customRange, motives, experience, description, features, customType, editType, tier } = params;
    const thresholds = buildThresholds(major, severe);
    return {
        name, difficulty: String(difficulty), hp: String(hp), stress: String(stress), thresholds,
        atk: attacks.length ? (attacks[0].name.match(/[+-]\d+/)?.[0] || '') : '',
        attack: attacks.length ? attacks[0].name : '',
        damage: attacks.length ? attacks[0].damage : '',
        range: attacks.length ? attacks[0].range : (customRange || ''),
        attacks, description: description || '', experience: experience || '',
        motives_and_tactics: motives || '', ability: '',
        feature: features, type: customType || editType || 'Custom', tier: tier || ''
    };
}

export function buildCharacterEnemyData(params) {
    const { name, hp, stress, major, severe, atk, features } = params;
    const thresholds = buildThresholds(major, severe);
    return {
        name, difficulty: '', hp: String(hp), stress: String(stress), thresholds,
        atk: atk.match(/[+-]\d+/)?.[0] || '', attack: atk, damage: '', range: '',
        description: '', experience: '', motives_and_tactics: '', ability: '',
        feature: features, type: 'Character', tier: ''
    };
}

export function updateCreatureStats(creature, stats) {
    return {
        ...stats,
        hpFilled: Math.min(creature.hpFilled, stats.hpMax),
        stressFilled: Math.min(creature.stressFilled, stats.stressMax),
        hopeFilled: Math.min(creature.hopeFilled, stats.hopeMax),
        armorFilled: Math.min(creature.armorFilled, stats.armorMax)
    };
}

export function featuresToText(features) {
    if (!features) return '';
    return features.map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n');
}

export function parseThresholds(thresholds) {
    if (!thresholds) return ['', ''];
    const parts = thresholds.split('/').map(s => s.trim());
    return [parts[0] === '?' ? '' : (parts[0] || ''), parts[1] === '?' ? '' : (parts[1] || '')];
}
