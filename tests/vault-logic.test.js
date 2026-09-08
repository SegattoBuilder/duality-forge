import { describe, it, expect } from 'vitest';
import { resetCreatureStats, migrateGroupEntry, validateShareAdvFields, getGroupMembers, buildShareAdversaryRow } from '../js/dm/vault-logic.js';

describe('resetCreatureStats', () => {
    it('resets all filled to max', () => {
        const creature = { hpMax: 10, stressMax: 5, hopeMax: 3, armorMax: 2 };
        const result = resetCreatureStats(creature);
        expect(result.hpFilled).toBe(10);
        expect(result.stressFilled).toBe(5);
        expect(result.hopeFilled).toBe(3);
        expect(result.armorFilled).toBe(2);
    });
});

describe('migrateGroupEntry', () => {
    it('converts string to object', () => {
        expect(migrateGroupEntry('Wolves')).toEqual({ name: 'Wolves', disposable: false });
    });

    it('passes object through', () => {
        const obj = { name: 'Wolves', disposable: true };
        expect(migrateGroupEntry(obj)).toBe(obj);
    });
});

describe('validateShareAdvFields', () => {
    it('valid with all conditions', () => {
        expect(validateShareAdvFields('Title', 'three words here', true)).toBe(true);
    });

    it('invalid without title', () => {
        expect(validateShareAdvFields('', 'three words here', true)).toBe(false);
    });

    it('invalid with short desc', () => {
        expect(validateShareAdvFields('Title', 'two', true)).toBe(false);
    });

    it('invalid without consent', () => {
        expect(validateShareAdvFields('Title', 'three words here', false)).toBe(false);
    });
});

describe('getGroupMembers', () => {
    const creatures = [
        { id: '1', vaultGroup: 'Wolves' },
        { id: '2', vaultGroup: 'Wolves' },
        { id: '3', vaultGroup: 'Bandits' },
        { id: '4' }
    ];
    const groups = [{ name: 'Wolves' }, { name: 'Bandits' }];

    it('returns members of a group', () => {
        expect(getGroupMembers(creatures, groups, 'Wolves')).toHaveLength(2);
    });

    it('returns ungrouped creatures', () => {
        expect(getGroupMembers(creatures, groups, '__ungrouped')).toHaveLength(1);
        expect(getGroupMembers(creatures, groups, '__ungrouped')[0].id).toBe('4');
    });

    it('returns empty for empty group', () => {
        expect(getGroupMembers(creatures, groups, 'Empty')).toHaveLength(0);
    });
});

describe('buildShareAdversaryRow', () => {
    it('builds complete row', () => {
        const user = { id: 'u1' };
        const profile = { nickname: 'DM' };
        const creature = { name: 'Orc', hpMax: 10, stressMax: 2, evasion: 12 };
        const ed = { hp: '10', stress: '2', difficulty: '12', thresholds: '5/10', type: 'Monster', tier: '2', attack: '', damage: '', range: '', atk: '', attacks: [], experience: '', motives_and_tactics: '', ability: '', description: '', feature: [] };
        const result = buildShareAdversaryRow(user, profile, creature, ed, 'Big Orc', 'A scary orc');
        expect(result.author_id).toBe('u1');
        expect(result.author_nickname).toBe('DM');
        expect(result.title).toBe('Big Orc');
        expect(result.adversary_data.name).toBe('Orc');
        expect(result.adv_type).toBe('Monster');
    });
});
