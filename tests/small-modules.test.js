import { describe, it, expect } from 'vitest';
import { normalizeInventoryInput } from '../js/character/inventory-logic.js';
import { normalizeExperienceInput, toggleChevron } from '../js/character/experience-logic.js';
import { computeInsertPosition } from '../js/character/sort-logic.js';

describe('normalizeInventoryInput', () => {
    it('defaults empty values', () => {
        expect(normalizeInventoryInput(null, null)).toEqual({ name: '', qty: '1' });
    });

    it('preserves provided values', () => {
        expect(normalizeInventoryInput('Rope', '3')).toEqual({ name: 'Rope', qty: '3' });
    });
});

describe('normalizeExperienceInput', () => {
    it('defaults empty values', () => {
        expect(normalizeExperienceInput(null, null, null)).toEqual({ name: '', value: '', desc: '' });
    });

    it('preserves provided values', () => {
        expect(normalizeExperienceInput('Stealth', '+2', 'Sneaky')).toEqual({ name: 'Stealth', value: '+2', desc: 'Sneaky' });
    });
});

describe('toggleChevron', () => {
    it('returns right arrow when hidden', () => {
        expect(toggleChevron(true)).toBe('▶');
    });

    it('returns down arrow when visible', () => {
        expect(toggleChevron(false)).toBe('▼');
    });
});

describe('computeInsertPosition', () => {
    it('returns after when dragging down', () => {
        expect(computeInsertPosition(1, 3)).toBe('after');
    });

    it('returns before when dragging up', () => {
        expect(computeInsertPosition(3, 1)).toBe('before');
    });
});
