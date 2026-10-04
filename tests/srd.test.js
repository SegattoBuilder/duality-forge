import { describe, it, expect } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { slug, nameKey, parseDamage, parseThresholds, parseExperiences, parseFeatureName, blocksToText } from '../tools/srd/lib.js';
import { adaptFlat, parseAdversaryNames } from '../tools/srd/adapters/flat.js';
import { adaptDaggersearch } from '../tools/srd/adapters/daggersearch.js';
import { merge } from '../tools/srd/merge.js';
import { KIND_SCHEMAS } from '../tools/srd/schema.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const valid = (kind, rec) => { const v = ajv.compile(KIND_SCHEMAS[kind]); return v(rec) || v.errors; };
const V2 = { version: 2, source: 'srd2' };

describe('merge rule (v1 frozen, v2 = new names only)', () => {
    const v1 = { 'domain-card': [{ id: 'domain-card.rune-ward', name: 'Rune Ward', text: 'v1 text', srd: { version: 1 } }] };
    const v2 = {
        'domain-card': [{ id: 'domain-card.rune-ward', name: 'Rune-Ward', text: 'changed', srd: { version: 2 } }, { id: 'domain-card.blighting-strike', name: 'Blighting Strike', srd: { version: 2 } }],
        environment: [{ id: 'environment.grove', name: 'Grove', srd: { version: 2 } }],
    };
    const { data, stats } = merge(v1, v2);
    it('keeps v1 when the same name exists in 2.0', () => {
        expect(data['domain-card'][0].text).toBe('v1 text');
        expect(stats['domain-card']).toMatchObject({ v1: 1, v2: 1, skipped: 1 });
    });
    it('adds new names as v2; 2.0-only kinds are all v2', () => {
        expect(data['domain-card'].map(r => r.id)).toEqual(['domain-card.rune-ward', 'domain-card.blighting-strike']);
        expect(stats.environment).toMatchObject({ v1: 0, v2: 1 });
    });
    it('different names are separate entries (no fuzzy matching)', () => {
        expect(nameKey('Volcanic Dragon: Ashen Tyrant')).not.toBe(nameKey('Ashen Tyrant'));
    });
});

describe('parsers', () => {
    it('slug', () => {
        expect(slug("Ilmari's Rifle")).toBe('ilmaris-rifle');
        expect(slug('Éclair Blade')).toBe('eclair-blade');
    });
    it('damage', () => {
        expect(parseDamage('1d12+2 phy')).toEqual({ count: 1, die: 12, bonus: 2, type: 'physical' });
        expect(parseDamage('d8 mag')).toEqual({ count: 1, die: 8, bonus: 0, type: 'magic' });
        expect(parseDamage('2d6-1 phy/mag')).toEqual({ count: 2, die: 6, bonus: -1, type: 'either' });
        expect(parseDamage('3 phy')).toEqual({ count: 0, die: 0, bonus: 3, type: 'physical' });
        expect(parseDamage('6 direct phy')).toMatchObject({ bonus: 6, direct: true });
        expect(() => parseDamage('lots')).toThrow();
    });
    it('thresholds', () => {
        expect(parseThresholds('8/14')).toEqual({ major: 8, severe: 14 });
        expect(parseThresholds('12/None')).toEqual({ major: 12, severe: null });
        expect(parseThresholds('None')).toBe(null);
    });
    it('experiences', () => {
        expect(parseExperiences('Ambusher +3, Keen Senses +2')).toEqual([{ name: 'Ambusher', bonus: 3 }, { name: 'Keen Senses', bonus: 2 }]);
        expect(parseExperiences(undefined)).toEqual([]);
    });
    it('feature names', () => {
        expect(parseFeatureName('Relentless (3) - Passive')).toEqual({ name: 'Relentless', kind: 'passive', value: 3 });
        expect(parseFeatureName('Earth Eruption - Action')).toEqual({ name: 'Earth Eruption', kind: 'action' });
        expect(parseFeatureName('Minion (X) - Passive')).toEqual({ name: 'Minion', kind: 'passive', value: 'X' });
        expect(parseFeatureName('Hit-and-Run')).toEqual({ name: 'Hit-and-Run' });          // not the pattern → unchanged
        expect(parseFeatureName('Rally - Leader')).toEqual({ name: 'Rally - Leader' });    // unknown kind → unchanged
    });
    it('v1 description blocks → Markdown-lite', () => {
        expect(blocksToText([{ paragraph: { 'en-US': 'First.' } }, { list: [{ 'en-US': 'a' }, { 'en-US': 'b' }] }])).toBe('First.\n\n- a\n- b');
    });
    it('environment adversary names', () => {
        expect(parseAdversaryNames('Beasts (Bear, Dire Wolf), Darkweave (*Crawler, Spinner*), Any')).toEqual(['Bear', 'Dire Wolf', 'Crawler', 'Spinner', 'Any']);
    });
});

describe('adapters produce valid records', () => {
    it('flat adversary', () => {
        const [r] = adaptFlat('adversary', [{ name: 'Acid Burrower', tier: '1', type: 'Horde (3/HP)', difficulty: '14', thresholds: '8/14', hp: '8', stress: 'None', atk: '+3', attack: 'Claws', range: 'Very Close', damage: '1d12+2 phy', experience: 'Tremor Sense +2', motives_and_tactics: 'Burrow, feed', description: 'Bug.', feature: [{ name: 'Relentless (3) - Passive', text: 'Again.' }] }], V2);
        expect(r).toMatchObject({ id: 'adversary.acid-burrower', role: 'horde', hordeHp: 3, stress: null, attack: { bonus: 3, range: 'very-close' }, srd: { version: 2, source: 'srd2' } });
        expect(valid('adversary', r)).toBe(true);
    });
    it('flat weapon + domain card', () => {
        const [w] = adaptFlat('weapon', [{ burden: 'Two-Handed', damage: 'd10+3 phy', feature: [], name: 'Katana', physical_or_magical: 'Physical', primary_or_secondary: 'Primary', range: 'Melee', tier: '1', trait: 'Agility' }], V2);
        expect(valid('weapon', w)).toBe(true);
        const [c] = adaptFlat('domain-card', [{ domain: 'Dread', level: '1', name: 'Blighting Strike', recall: '1', text: 'Deal **d6**.', type: 'Spell' }], V2);
        expect(c).toMatchObject({ domain: 'domain.dread', cardType: 'spell', level: 1, recall: 1 });
        expect(valid('domain-card', c)).toBe(true);
    });
    it('flat subclass needs its class', () => {
        const classes = [{ name: 'Assassin', subclass_1: 'Executioners Guild' }];
        const f = [{ name: 'X', text: 'Y' }];
        const [s] = adaptFlat('subclass', [{ name: 'Executioners Guild', foundation: f, specialization: f, mastery: f }], { ...V2, classes });
        expect(s.class).toBe('class.assassin');
        expect(valid('subclass', s)).toBe(true);
        expect(() => adaptFlat('subclass', [{ name: 'Orphan', foundation: f, specialization: f, mastery: f }], { ...V2, classes })).toThrow();
    });
    it('daggersearch weapon + class', () => {
        const [w] = adaptDaggersearch('weapon', [{ id: 'core_weapon_broadsword', name: { 'en-US': 'Broadsword' }, type: 'PRIMARY_PHYSICAL', tier: 1, trait: 'AGILITY', range: 'VERY_CLOSE', damage: { dice: 'D8', type: 'PHYSICAL' }, burden: 'ONE_HANDED', features: [] }], { version: 1, source: 'daggersearch' });
        expect(w).toMatchObject({ id: 'weapon.broadsword', range: 'very-close', damage: { count: 1, die: 8, bonus: 0 }, srd: { ref: 'core_weapon_broadsword' } });
        expect(valid('weapon', w)).toBe(true);
        const [c] = adaptDaggersearch('class', [{ id: 'core_class_bard', name: 'BARD', description: [{ paragraph: { 'en-US': 'Bards.' } }], domains: ['GRACE', 'CODEX'], startingEvasion: 10, startingHitPoints: 5, hopeFeature: { name: { 'en-US': 'Make a Scene' }, description: [{ paragraph: { 'en-US': 'Spend 3 Hope.' } }] }, classFeatures: [{ name: { 'en-US': 'Rally' }, description: [{ paragraph: { 'en-US': 'x' } }] }], classItems: [{ 'en-US': 'A lute' }] }], { version: 1, source: 'daggersearch' });
        expect(c).toMatchObject({ id: 'class.bard', name: 'Bard', domains: ['domain.grace', 'domain.codex'], hopeFeature: { kind: 'hope' } });
        expect(valid('class', c)).toBe(true);
    });
    it('schema rejects bad values', () => {
        const [c] = adaptFlat('domain-card', [{ domain: 'Fire', level: '1', name: 'X', recall: '0', text: 'a', type: 'Spell' }], V2);
        expect(valid('domain-card', { ...c, cardType: 'ritual' })).not.toBe(true);
        expect(valid('domain-card', { ...c, extra: 1 })).not.toBe(true);
    });
});
