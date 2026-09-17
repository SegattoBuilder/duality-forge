import { computeDotToggle } from '../core/utils.js';
export { computeDotToggle as computeDotTarget } from '../core/utils.js';

export function computeThreshold(level, baseValue, extraValue) {
    return baseValue + level + extraValue;
}

export function resolveAttackBonus(traitValue) {
    return traitValue ? (traitValue || '0') : '—';
}

export function computeTier(level) {
    const n = parseInt(level) || 1;
    if (n >= 8) return 3;
    if (n >= 5) return 2;
    if (n >= 2) return 1;
    return 0;
}
