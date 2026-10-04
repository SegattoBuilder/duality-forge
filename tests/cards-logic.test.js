import { describe, it, expect } from 'vitest';
import { domainColor, escAttr, validateShareFields, validateDomainCardFields, validateGeneralCardFields, cardSortComparator } from '../js/character/cards-logic.js';

describe('domainColor', () => {
    const COLORS = { BLADE: { text: '#c75a4a', border: '#933728', bg: '#93372830' } };

    it('returns matching domain color', () => {
        expect(domainColor('BLADE', COLORS).text).toBe('#c75a4a');
    });

    it('returns fallback for unknown domain', () => {
        const result = domainColor('UNKNOWN', COLORS);
        expect(result.text).toBe('#a1a1aa');
    });
});

describe('escAttr', () => {
    it('escapes HTML attribute entities', () => {
        expect(escAttr('"test"&')).toBe('&quot;test&quot;&amp;');
    });

    it('handles null', () => {
        expect(escAttr(null)).toBe('');
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
});

describe('validateDomainCardFields', () => {
    it('valid with all fields', () => {
        expect(validateDomainCardFields({ name: 'X', domain: 'BLADE', type: 'SPELL', level: '1', recall: '2' })).toBe(true);
    });

    it('invalid with missing name', () => {
        expect(validateDomainCardFields({ name: '', domain: 'BLADE', type: 'SPELL', level: '1', recall: '2' })).toBe(false);
    });
});

describe('validateGeneralCardFields', () => {
    it('valid with category and name', () => {
        expect(validateGeneralCardFields({ category: 'ancestries', name: 'Elf' })).toBe(true);
    });

    it('invalid without category', () => {
        expect(validateGeneralCardFields({ category: '', name: 'Elf' })).toBe(false);
    });
});

describe('cardSortComparator', () => {
    const selected = new Set(['fireball']);

    it('selected cards sort before unselected', () => {
        expect(cardSortComparator(selected, { name: 'fireball', level: 5 }, { name: 'shield', level: 1 })).toBeLessThan(0);
    });

    it('same selection status sorts by level', () => {
        expect(cardSortComparator(selected, { name: 'a', level: 3 }, { name: 'b', level: 1 })).toBeGreaterThan(0);
    });
});
