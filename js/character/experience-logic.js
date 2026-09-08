export function normalizeExperienceInput(name, value, desc) {
    return { name: name || '', value: value || '', desc: desc || '' };
}

export function toggleChevron(isHidden) {
    return isHidden ? '▶' : '▼';
}
