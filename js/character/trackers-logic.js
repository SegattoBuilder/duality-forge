import { computeDotToggle } from '../core/utils.js';
export { computeDotToggle as computeDotTarget } from '../core/utils.js';

export function computeThreshold(level, baseValue, extraValue) {
    return baseValue + level + extraValue;
}

export function resolveAttackBonus(traitValue) {
    return traitValue ? (traitValue || '0') : '—';
}
