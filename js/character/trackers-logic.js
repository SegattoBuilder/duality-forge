export function computeDotTarget(index, currentFilled) {
    return index < currentFilled ? index : index + 1;
}

export function computeThreshold(level, baseValue, extraValue) {
    return baseValue + level + extraValue;
}

export function resolveAttackBonus(traitValue) {
    return traitValue ? (traitValue || '0') : '—';
}
