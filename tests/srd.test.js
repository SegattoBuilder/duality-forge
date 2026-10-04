import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { mdToDescription, nameKey } from '../tools/srd/lib.js';
import { adaptV2, parseDamage, parsePersonalities } from '../tools/srd/adapters/v2.js';
import { merge } from '../tools/srd/merge.js';
import { CATEGORY_SCHEMAS } from '../tools/srd/schema.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const valid = (cat, rec) => { const v = ajv.compile(CATEGORY_SCHEMAS[cat]); const ok = v(rec); return ok || v.errors; };

describe('merge rule (v1 frozen, v2 = new names only)', () => {
    const v1 = { 'domain-cards': [{ id: 'core_a', name: { 'en-US': 'Rune Ward' }, text: 'v1 text', srdVersion: 1 }] };
    const v2 = { 'domain-cards': [
        { id: 'v2_a', name: { 'en-US': 'rune-ward' }, text: 'changed in 2.0', srdVersion: 2 },
        { id: 'v2_b', name: { 'en-US': 'Blighting Strike' }, srdVersion: 2 },
    ], environments: [{ id: 'v2_e', name: 'Abandoned Grove', srdVersion: 2 }] };
    const { data, stats } = merge(v1, v2);

    it('keeps v1 untouched when the same name exists in 2.0', () => {
        expect(data['domain-cards'].find(r => r.id === 'core_a').text).toBe('v1 text');
        expect(data['domain-cards'].some(r => r.id === 'v2_a')).toBe(false);
        expect(stats['domain-cards'].skipped).toBe(1);
    });
    it('adds new 2.0 names as v2', () => {
        expect(data['domain-cards'].map(r => r.id)).toEqual(['core_a', 'v2_b']);
    });
    it('2.0-only categories are all v2', () => {
        expect(data.environments).toHaveLength(1);
        expect(stats.environments).toMatchObject({ v1: 0, v2: 1 });
    });
    it('different names are separate entries (no fuzzy matching)', () => {
        expect(nameKey('Volcanic Dragon: Ashen Tyrant')).not.toBe(nameKey('Ashen Tyrant'));
    });
});

describe('v2 parsing', () => {
    it('damage', () => {
        expect(parseDamage('d8 phy')).toEqual({ dice: 'D8', type: 'PHYSICAL' });
        expect(parseDamage('d10+3 mag')).toEqual({ dice: 'D10', modifier: 3, type: 'MAGICAL' });
        expect(parseDamage('d6+1 phy/mag')).toEqual({ dice: 'D6', modifier: 1, type: 'PHYSICAL_OR_MAGICAL' });
        expect(() => parseDamage('2d6')).toThrow();
    });
    it('personalities from community note', () => {
        expect(parsePersonalities('Duneborne are often adaptable, centered, and observant.').map(p => p['en-US'])).toEqual(['adaptable', 'centered', 'observant']);
        expect(parsePersonalities('')).toEqual([]);
    });
    it('markdown → paragraphs and lists', () => {
        expect(mdToDescription('First **bold**.\n\n- one\n- two\n\n## Heading')).toEqual([
            { paragraph: { 'en-US': 'First **bold**.' } },
            { list: [{ 'en-US': 'one' }, { 'en-US': 'two' }] },
            { paragraph: { 'en-US': '**Heading**' } },
        ]);
    });
});

describe('v2 adapter output matches our template', () => {
    it('domain card', () => {
        const [r] = adaptV2('domain-cards', [{ domain: 'Dread', level: '1', name: 'Blighting Strike', recall: '1', text: 'Deal **d6**.', type: 'Spell' }]);
        expect(r).toMatchObject({ id: 'v2_domain_card_blighting_strike', domain: 'DREAD', type: 'SPELL', level: 1, recallCost: 1, srdVersion: 2 });
        expect(valid('domain-cards', r)).toBe(true);
    });
    it('weapon', () => {
        const [r] = adaptV2('weapons', [{ burden: 'Two-Handed', damage: 'd10+3 phy', feature: [{ name: 'Quick', text: 'Mark a Stress.' }], name: 'Katana', physical_or_magical: 'Physical', primary_or_secondary: 'Primary', range: 'Very Close', tier: '1', trait: 'Agility' }]);
        expect(r).toMatchObject({ type: 'PRIMARY_PHYSICAL', range: 'VERY_CLOSE', burden: 'TWO_HANDED', damage: { dice: 'D10', modifier: 3 } });
        expect(valid('weapons', r)).toBe(true);
    });
    it('armor thresholds', () => {
        const [r] = adaptV2('armors', [{ base_score: '3', base_thresholds: '5 / 11', feature: [], name: 'Leather', tier: '1' }]);
        expect(r).toMatchObject({ baseMajorThreshold: 5, baseSevereThreshold: 11, baseScore: 3 });
        expect(valid('armors', r)).toBe(true);
    });
    it('subclass gets class + domains from classes list', () => {
        const classes = [{ name: 'Assassin', domain_1: 'Blade', domain_2: 'Midnight', subclass_1: 'Executioners Guild', subclass_2: 'Poisoners Guild' }];
        const f = [{ name: 'X', text: 'Y' }];
        const [r] = adaptV2('subclasses', [{ name: 'Executioners Guild', spellcast_trait: 'Agility', foundation: f, specialization: f, mastery: f }], { classes });
        expect(r).toMatchObject({ class: 'ASSASSIN', domains: ['BLADE', 'MIDNIGHT'], spellcastTrait: 'AGILITY' });
        expect(valid('subclasses', r)).toBe(true);
        expect(() => adaptV2('subclasses', [{ name: 'Orphan', foundation: f, specialization: f, mastery: f }], { classes })).toThrow();
    });
    it('schema rejects bad values', () => {
        const bad = { id: 'v2_x', srdVersion: 2, source: 'srd2', name: { 'en-US': 'X' }, domain: 'FIRE', type: 'SPELL', level: 1, recallCost: 0, features: [{ description: [{ paragraph: { 'en-US': 'a' } }] }] };
        expect(valid('domain-cards', bad)).not.toBe(true);
    });
});
