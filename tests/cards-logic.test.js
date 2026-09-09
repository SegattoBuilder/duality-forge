import { describe, it, expect } from 'vitest';
import { t, domainColor, parseDesc, parseItem, escAttr, buildFeatureHtml, validateShareFields, validateDomainCardFields, validateGeneralCardFields, cardSortComparator, flattenClasses, flattenSubclasses } from '../js/character/cards-logic.js';

describe('t (text resolver)', () => {
    it('returns empty string for falsy', () => {
        expect(t(null)).toBe('');
        expect(t(undefined)).toBe('');
        expect(t('')).toBe('');
    });

    it('returns string as-is', () => {
        expect(t('hello')).toBe('hello');
    });

    it('resolves en-US key', () => {
        expect(t({ 'en-US': 'Fire Bolt' })).toBe('Fire Bolt');
    });

    it('converts non-string to string', () => {
        expect(t(42)).toBe('42');
    });
});

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

describe('parseDesc', () => {
    it('returns empty for falsy', () => {
        expect(parseDesc(null)).toBe('');
    });

    it('returns string as-is', () => {
        expect(parseDesc('simple text')).toBe('simple text');
    });

    it('parses paragraph array', () => {
        const result = parseDesc([{ paragraph: 'Hello' }]);
        expect(result).toBe('<p>Hello</p>');
    });

    it('parses list array', () => {
        const result = parseDesc([{ list: ['A', 'B'] }]);
        expect(result).toContain('• A');
        expect(result).toContain('• B');
    });
});

describe('parseItem', () => {
    it('extracts name and desc', () => {
        const result = parseItem({ name: 'Fireball', description: 'Boom' });
        expect(result.name).toBe('Fireball');
        expect(result.desc).toBe('Boom');
    });

    it('falls back to Unnamed Card', () => {
        expect(parseItem({}).name).toBe('Unnamed Card');
    });

    it('parses features', () => {
        const result = parseItem({ name: 'X', features: [{ name: 'Burn', description: 'Hot' }] });
        expect(result.feature).toContain('Burn');
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

describe('buildFeatureHtml', () => {
    it('builds HTML from features', () => {
        const result = buildFeatureHtml([{ name: 'Rage', text: 'Get angry' }]);
        expect(result).toContain('Rage');
        expect(result).toContain('Get angry');
    });

    it('filters empty features', () => {
        expect(buildFeatureHtml([{ name: '', text: '' }])).toBe('');
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

describe('flattenClasses', () => {
    it('flattens class features', () => {
        const data = [{ name: 'Warrior', domains: ['BLADE'], classFeatures: [{ name: 'Strike', description: 'Hit' }] }];
        const result = flattenClasses(data);
        expect(result.length).toBe(1);
        expect(result[0]._display).toContain('Warrior');
        expect(result[0].name).toBe('Strike');
    });

    it('includes hope feature', () => {
        const data = [{ name: 'Cleric', domains: [], hopeFeature: { name: 'Heal', description: 'Restore' }, classFeatures: [] }];
        const result = flattenClasses(data);
        expect(result.length).toBe(1);
        expect(result[0]._display).toContain('Hope Feature');
    });
});

describe('flattenSubclasses', () => {
    it('flattens subclass tiers', () => {
        const data = [{ name: 'Berserker', class: 'Warrior', foundation: { features: [{ name: 'Rage' }] }, specialization: { features: [{ name: 'Fury' }] } }];
        const result = flattenSubclasses(data);
        expect(result.length).toBe(2);
        expect(result[0]._tier).toBe('foundation');
        expect(result[1]._tier).toBe('specialization');
    });
});
