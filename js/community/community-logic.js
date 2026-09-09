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
