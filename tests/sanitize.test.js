// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Browsers load the vendored UMD file as an ES module, which sets globalThis.DOMPurify.
// Node loads it as CommonJS instead, so expose it the same way here.
globalThis.DOMPurify = createRequire(import.meta.url)('../js/vendor/purify.min.js');
import { sanitizeHtml } from '../js/core/utils.js';

describe('sanitizeHtml', () => {
    it('removes event handlers', () => {
        const out = sanitizeHtml('<img src=x onerror="alert(1)"><p onclick="x()">hi</p>');
        expect(out).not.toMatch(/onerror|onclick|<img/);
        expect(out).toContain('<p>hi</p>');
    });

    it('removes script tags', () => {
        expect(sanitizeHtml('<script>alert(1)</script>ok')).toBe('ok');
    });

    it('removes javascript: links', () => {
        expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/);
    });

    it('keeps Quill formatting', () => {
        const html = '<p><strong>Bold</strong> <em>it</em></p><ol><li data-list="bullet">one</li></ol><a href="https://x.com" target="_blank" rel="noopener">l</a>';
        expect(sanitizeHtml(html)).toBe(html);
    });

    it('keeps feature markup classes', () => {
        const html = '<div class="text-zinc-200"><strong>Feature:</strong> text</div>';
        expect(sanitizeHtml(html)).toBe(html);
    });

    it('drops layout styles', () => {
        expect(sanitizeHtml('<span style="position:fixed; top:0">x</span>')).toBe('<span>x</span>');
    });

    it('keeps Quill text color and highlight only', () => {
        const out = sanitizeHtml('<span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0); position: fixed">x</span>');
        expect(out).toContain('color: rgb(230, 0, 0)');
        expect(out).toContain('background-color: rgb(255, 255, 0)');
        expect(out).not.toContain('position');
    });

    it('returns empty for empty input', () => {
        expect(sanitizeHtml('')).toBe('');
        expect(sanitizeHtml(null)).toBe('');
    });
});
