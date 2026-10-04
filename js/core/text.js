// Markdown-lite renderer for SRD and homebrew text — safe by construction:
// everything is HTML-escaped FIRST, then only these rules add markup:
//   blank line = paragraph · "- " / "* " / "• " lists · "#" headings · | tables | · **bold** · _italic_ / *italic*
import { escHtmlAttr as esc } from './utils.js';

function inline(s) {
    return esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // no lookbehind (older iOS Safari can't parse it)
        .replace(/(^|[\s(])_([^\s_](?:[^_]*[^\s_])?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
        .replace(/(^|[\s(])\*([^\s*](?:[^*]*[^\s*])?)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
}

const isTableRow = (l) => /^\|.*\|$/.test(l);
const isDivider = (l) => /^\|[\s:|-]+\|$/.test(l);
const cells = (l) => l.slice(1, -1).split('|').map(c => c.trim());

function table(lines) {
    const rows = lines.filter(l => !isDivider(l)).map(cells);
    if (!rows.length) return '';
    const [head, ...body] = lines.length > 1 && isDivider(lines[1]) ? rows : [null, ...rows];
    const tr = (r, tag) => `<tr>${r.map(c => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`;
    return `<div class="md-table-wrap"><table class="md-table">${head ? `<thead>${tr(head, 'th')}</thead>` : ''}<tbody>${body.map(r => tr(r, 'td')).join('')}</tbody></table></div>`;
}

export function renderText(md) {
    if (md == null || md === '') return '';
    const blocks = String(md).replace(/\r/g, '').split(/\n\s*\n/);
    const out = [];
    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        let i = 0;
        while (i < lines.length) {
            const l = lines[i];
            if (isTableRow(l)) {
                const start = i; while (i < lines.length && isTableRow(lines[i])) i++;
                out.push(table(lines.slice(start, i)));
            } else if (/^[-*•]\s+/.test(l)) {
                const start = i; while (i < lines.length && /^[-*•]\s+/.test(lines[i])) i++;
                out.push(`<ul class="md-list">${lines.slice(start, i).map(x => `<li>${inline(x.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`);
            } else if (/^#{1,6}\s/.test(l)) {
                out.push(`<p class="md-heading"><strong>${inline(l.replace(/^#{1,6}\s+/, ''))}</strong></p>`); i++;
            } else {
                const start = i; while (i < lines.length && !isTableRow(lines[i]) && !/^[-*•]\s+/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])) i++;
                out.push(`<p>${lines.slice(start, i).map(inline).join('<br>')}</p>`);
            }
        }
    }
    return out.join('');
}

// Feature list: [{ name, kind?, value?, text }] → HTML (kind shown as a small chip)
export function renderFeatures(features, { nameClass = 'text-[11px] font-bold text-amber-400 mt-1', textClass = 'text-[11px] text-zinc-400 leading-relaxed' } = {}) {
    return (features || []).filter(f => f && (f.name || f.text)).map(f => {
        const chip = f.kind ? ` <span class="feature-kind feature-kind-${esc(f.kind)}">${esc(f.kind)}${f.value !== undefined ? ` ${esc(f.value)}` : ''}</span>` : '';
        return `${f.name ? `<div class="${nameClass}">${esc(f.name)}${chip}</div>` : ''}<div class="${textClass}">${renderText(f.text)}</div>`;
    }).join('');
}

// Plain text for search indexes / previews
export function plainText(md) {
    return String(md ?? '').replace(/\*\*|__|[*_`#|]/g, ' ').replace(/^\s*[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
}
