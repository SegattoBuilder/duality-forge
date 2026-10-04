// Shared helpers for the SRD data pipeline (Node only — not loaded by the app)

export const loc = (s) => ({ 'en-US': String(s ?? '').trim() });

// Comparison key: case/punctuation-insensitive name ("Rune Ward" == "rune-ward")
export const nameKey = (name) => String(name?.['en-US'] ?? name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const slug = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const upperEnum = (s) => String(s ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export const int = (s) => {
    const n = parseInt(String(s ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
};

// Markdown text → v1 description blocks: [{ paragraph }, { list: [...] }]
// Headings become bold paragraphs; inline **bold** / _italic_ are kept as-is.
export function mdToDescription(text) {
    const blocks = [];
    for (const raw of String(text ?? '').replace(/\r/g, '').split(/\n\s*\n/)) {
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        if (lines.every(l => /^[-*•]\s+/.test(l))) {
            blocks.push({ list: lines.map(l => loc(l.replace(/^[-*•]\s+/, ''))) });
            continue;
        }
        for (const l of lines.length > 1 && lines.some(l => /^#{1,6}\s/.test(l)) ? lines : [lines.join(' ')]) {
            const h = l.match(/^#{1,6}\s+(.*)$/);
            blocks.push({ paragraph: loc(h ? `**${h[1].trim()}**` : l) });
        }
    }
    return blocks.length ? blocks : [{ paragraph: loc('') }];
}

// v2 feature {name, text} → v1 feature {name, description}
export const feature = (f) => ({ ...(f.name ? { name: loc(f.name) } : {}), description: mdToDescription(f.text ?? f.description ?? '') });

export async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return JSON.parse((await res.text()).replace(/^\uFEFF/, ''));
}

export const rawUrl = (src, file) => `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${src.path}/${file}`;

export const asList = (d) => (Array.isArray(d) ? d : (d.items || d.entries || Object.values(d)));
