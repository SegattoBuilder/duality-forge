import { describe, it, expect } from 'vitest';
import { computeDotTarget, computeThreshold, resolveAttackBonus } from '../js/character/trackers-logic.js';

describe('computeDotTarget', () => {
    it('fills up to clicked index when clicking ahead of filled', () => {
        expect(computeDotTarget(3, 2)).toBe(4);
    });

    it('unfills back to clicked index when clicking behind filled', () => {
        expect(computeDotTarget(1, 4)).toBe(1);
    });

    it('fills first dot from empty', () => {
        expect(computeDotTarget(0, 0)).toBe(1);
    });

    it('clears all when clicking first dot that is filled', () => {
        expect(computeDotTarget(0, 3)).toBe(0);
    });

    it('toggles single dot', () => {
        expect(computeDotTarget(0, 1)).toBe(0);
    });
});

describe('computeThreshold', () => {
    it('sums level + base + extra', () => {
        expect(computeThreshold(3, 5, 2)).toBe(10);
    });

    it('handles zeros', () => {
        expect(computeThreshold(0, 0, 0)).toBe(0);
    });

    it('works with only level', () => {
        expect(computeThreshold(5, 0, 0)).toBe(5);
    });
});

describe('resolveAttackBonus', () => {
    it('returns value when trait has a value', () => {
        expect(resolveAttackBonus('+3')).toBe('+3');
    });

    it('returns 0 when trait value is falsy but not null', () => {
        expect(resolveAttackBonus('')).toBe('—');
    });

    it('returns dash when null', () => {
        expect(resolveAttackBonus(null)).toBe('—');
    });

    it('returns dash when undefined', () => {
        expect(resolveAttackBonus(undefined)).toBe('—');
    });
});
