import { describe, it, expect } from 'vitest';
import { generateId, computeDotToggle, validateShareFields, escHtml, escHtmlAttr } from '../js/core/utils.js';

describe('generateId', () => {
    it('uses default prefix', () => {
        expect(generateId()).toMatch(/^c-\d+-[a-z0-9]+$/);
    });

    it('uses custom prefix', () => {
        expect(generateId('ch')).toMatch(/^ch-\d+-[a-z0-9]+$/);
    });

    it('generates unique ids', () => {
        const a = generateId();
        const b = generateId();
        expect(a).not.toBe(b);
    });
});

describe('computeDotToggle', () => {
    it('fills forward when clicking ahead', () => {
        expect(computeDotToggle(3, 2)).toBe(4);
    });

    it('unfills when clicking behind', () => {
        expect(computeDotToggle(1, 4)).toBe(1);
    });

    it('fills first dot from empty', () => {
        expect(computeDotToggle(0, 0)).toBe(1);
    });

    it('clears all when clicking first filled dot', () => {
        expect(computeDotToggle(0, 3)).toBe(0);
    });

    it('toggles single dot off', () => {
        expect(computeDotToggle(0, 1)).toBe(0);
    });
});

describe('validateShareFields', () => {
    it('valid when all conditions met', () => {
        expect(validateShareFields('Title', 'three words here', true)).toBe(true);
    });

    it('invalid without title', () => {
        expect(validateShareFields('', 'three words here', true)).toBe(false);
    });

    it('invalid with short description', () => {
        expect(validateShareFields('Title', 'two', true)).toBe(false);
    });

    it('invalid without consent', () => {
        expect(validateShareFields('Title', 'three words here', false)).toBe(false);
    });

    it('trims whitespace-only words', () => {
        expect(validateShareFields('Title', '  a  b  ', true)).toBe(false);
    });
});

describe('escHtml', () => {
    it('escapes angle brackets', () => {
        expect(escHtml('<div>')).toBe('&lt;div&gt;');
    });

    it('escapes ampersand', () => {
        expect(escHtml('a & b')).toBe('a &amp; b');
    });

    it('converts **bold** to <strong>', () => {
        expect(escHtml('**hello**')).toBe('<strong>hello</strong>');
    });

    it('handles multiple bold segments', () => {
        expect(escHtml('**a** and **b**')).toBe('<strong>a</strong> and <strong>b</strong>');
    });

    it('escapes html inside bold', () => {
        expect(escHtml('**<b>**')).toBe('<strong>&lt;b&gt;</strong>');
    });

    it('returns empty for falsy', () => {
        expect(escHtml(null)).toBe('');
        expect(escHtml(undefined)).toBe('');
        expect(escHtml('')).toBe('');
    });

    it('converts numbers to string', () => {
        expect(escHtml(42)).toBe('42');
    });
});

describe('escHtmlAttr', () => {
    it('escapes quotes', () => {
        expect(escHtmlAttr('"test"')).toBe('&quot;test&quot;');
    });

    it('escapes ampersand', () => {
        expect(escHtmlAttr('a&b')).toBe('a&amp;b');
    });

    it('does not escape angle brackets', () => {
        expect(escHtmlAttr('<b>')).toBe('<b>');
    });

    it('returns empty for falsy', () => {
        expect(escHtmlAttr(null)).toBe('');
        expect(escHtmlAttr('')).toBe('');
    });
});
