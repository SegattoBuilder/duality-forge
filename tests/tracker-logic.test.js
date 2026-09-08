import { describe, it, expect } from 'vitest';
import { createCounter, clampCounterValue, computeFearToggle, searchEnemies, parseFeatures, buildThresholds, clampQty, isCreatureDead, computeDotToggle, adjustMaxValue, clampEvasion, enemyDataToAttacks, buildEnemyData, buildCharacterEnemyData, updateCreatureStats, featuresToText, parseThresholds } from '../js/dm/tracker-logic.js';

describe('createCounter', () => {
    it('creates counter with defaults', () => {
        const c = createCounter();
        expect(c.id).toMatch(/^ac-/);
        expect(c.label).toBe('Action Counter');
        expect(c.value).toBe(0);
    });
});

describe('clampCounterValue', () => {
    it('increments within range', () => {
        expect(clampCounterValue(5, 1)).toBe(6);
    });

    it('clamps at 0', () => {
        expect(clampCounterValue(0, -1)).toBe(0);
    });

    it('clamps at 100', () => {
        expect(clampCounterValue(100, 1)).toBe(100);
    });
});

describe('computeFearToggle', () => {
    it('fills up to index + 1', () => {
        expect(computeFearToggle(3, 0)).toBe(4);
    });

    it('unfills back to index', () => {
        expect(computeFearToggle(2, 5)).toBe(2);
    });
});

describe('searchEnemies', () => {
    const data = [{ name: 'Goblin' }, { name: 'Dragon' }, { name: 'Goblin King' }];

    it('finds matching enemies', () => {
        expect(searchEnemies('gob', data)).toHaveLength(2);
    });

    it('returns empty for short query', () => {
        expect(searchEnemies('g', data)).toHaveLength(0);
    });

    it('returns empty for null query', () => {
        expect(searchEnemies(null, data)).toHaveLength(0);
    });

    it('limits to 10 results', () => {
        const big = Array.from({ length: 20 }, (_, i) => ({ name: `Enemy ${i}` }));
        expect(searchEnemies('Enemy', big)).toHaveLength(10);
    });
});

describe('parseFeatures', () => {
    it('parses colon-separated features', () => {
        const result = parseFeatures('Rage: Get angry\nStrike: Hit hard');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Rage', text: 'Get angry' });
    });

    it('handles features without colon', () => {
        const result = parseFeatures('Simple Feature');
        expect(result[0]).toEqual({ name: 'Simple Feature', text: '' });
    });

    it('returns empty for falsy input', () => {
        expect(parseFeatures('')).toEqual([]);
        expect(parseFeatures(null)).toEqual([]);
    });
});

describe('buildThresholds', () => {
    it('builds threshold string', () => {
        expect(buildThresholds('5', '10')).toBe('5/10');
    });

    it('uses ? for missing values', () => {
        expect(buildThresholds('5', '')).toBe('5/?');
        expect(buildThresholds('', '10')).toBe('?/10');
    });

    it('returns empty when both missing', () => {
        expect(buildThresholds('', '')).toBe('');
    });
});

describe('clampQty', () => {
    it('clamps to 1-20 range', () => {
        expect(clampQty('0')).toBe(1);
        expect(clampQty('25')).toBe(20);
        expect(clampQty('5')).toBe(5);
    });

    it('defaults NaN to 1', () => {
        expect(clampQty('abc')).toBe(1);
    });
});

describe('isCreatureDead', () => {
    it('dead when hp is 0', () => {
        expect(isCreatureDead({ hpFilled: 0 })).toBe(true);
    });

    it('dead when hp is negative', () => {
        expect(isCreatureDead({ hpFilled: -1 })).toBe(true);
    });

    it('alive when hp > 0', () => {
        expect(isCreatureDead({ hpFilled: 1 })).toBe(false);
    });
});

describe('computeDotToggle', () => {
    it('fills forward', () => {
        expect(computeDotToggle(3, 2)).toBe(4);
    });

    it('unfills backward', () => {
        expect(computeDotToggle(1, 4)).toBe(1);
    });
});

describe('adjustMaxValue', () => {
    it('increases max and filled', () => {
        const result = adjustMaxValue(5, 3, 1);
        expect(result.max).toBe(6);
        expect(result.filled).toBe(4);
    });

    it('decreases max and clamps filled', () => {
        const result = adjustMaxValue(5, 5, -1);
        expect(result.max).toBe(4);
        expect(result.filled).toBe(4);
    });

    it('returns null when below 0', () => {
        expect(adjustMaxValue(0, 0, -1)).toBeNull();
    });

    it('returns null when above 30', () => {
        expect(adjustMaxValue(30, 30, 1)).toBeNull();
    });
});

describe('clampEvasion', () => {
    it('clamps between 0 and 30', () => {
        expect(clampEvasion(0, -1)).toBe(0);
        expect(clampEvasion(30, 1)).toBe(30);
        expect(clampEvasion(15, 3)).toBe(18);
    });
});

describe('enemyDataToAttacks', () => {
    it('returns attacks array if present', () => {
        const ed = { attacks: [{ name: 'Slash' }] };
        expect(enemyDataToAttacks(ed)).toEqual([{ name: 'Slash' }]);
    });

    it('builds from single attack fields', () => {
        const ed = { attack: 'Bite', damage: '1d6', range: 'Melee', atk: '+3' };
        expect(enemyDataToAttacks(ed)).toHaveLength(1);
        expect(enemyDataToAttacks(ed)[0].name).toBe('Bite');
    });

    it('returns empty when no attack data', () => {
        expect(enemyDataToAttacks({})).toEqual([]);
    });
});

describe('buildEnemyData', () => {
    it('builds complete enemy data object', () => {
        const result = buildEnemyData({
            name: 'Orc', difficulty: 12, hp: 10, stress: 2,
            major: '5', severe: '10', attacks: [{ name: 'Axe', damage: '1d8' }],
            customRange: '', motives: 'Kill', experience: '100',
            description: 'Big', features: [{ name: 'Rage', text: 'Angry' }],
            customType: 'Monster', editType: '', tier: '2'
        });
        expect(result.name).toBe('Orc');
        expect(result.thresholds).toBe('5/10');
        expect(result.type).toBe('Monster');
        expect(result.feature).toHaveLength(1);
    });
});

describe('buildCharacterEnemyData', () => {
    it('builds character enemy data', () => {
        const result = buildCharacterEnemyData({
            name: 'Hero', hp: 20, stress: 5, major: '7', severe: '14',
            atk: '+5 Sword', features: []
        });
        expect(result.type).toBe('Character');
        expect(result.atk).toBe('+5');
        expect(result.thresholds).toBe('7/14');
    });
});

describe('updateCreatureStats', () => {
    it('clamps filled values to new max', () => {
        const creature = { hpFilled: 10, stressFilled: 5, hopeFilled: 3, armorFilled: 2 };
        const result = updateCreatureStats(creature, { hpMax: 8, stressMax: 3, hopeMax: 6, armorMax: 1 });
        expect(result.hpFilled).toBe(8);
        expect(result.stressFilled).toBe(3);
        expect(result.hopeFilled).toBe(3);
        expect(result.armorFilled).toBe(1);
    });
});

describe('featuresToText', () => {
    it('converts features to text', () => {
        expect(featuresToText([{ name: 'Rage', text: 'Angry' }])).toBe('Rage: Angry');
    });

    it('handles feature without text', () => {
        expect(featuresToText([{ name: 'Passive' }])).toBe('Passive');
    });

    it('returns empty for falsy', () => {
        expect(featuresToText(null)).toBe('');
    });
});

describe('parseThresholds', () => {
    it('parses threshold string', () => {
        expect(parseThresholds('5/10')).toEqual(['5', '10']);
    });

    it('replaces ? with empty', () => {
        expect(parseThresholds('?/10')).toEqual(['', '10']);
    });

    it('returns empty pair for falsy', () => {
        expect(parseThresholds('')).toEqual(['', '']);
        expect(parseThresholds(null)).toEqual(['', '']);
    });
});
