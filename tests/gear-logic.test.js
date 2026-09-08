import { describe, it, expect } from 'vitest';
import { resolveEquipped, equipStar, equipOpacity, normalizeGearInput, TRAIT_OPTIONS } from '../js/character/gear-logic.js';

describe('resolveEquipped', () => {
    it('uses explicit true', () => {
        expect(resolveEquipped(true, false)).toBe(true);
    });

    it('uses explicit false', () => {
        expect(resolveEquipped(false, true)).toBe(false);
    });

    it('falls back to isFirstItem when undefined', () => {
        expect(resolveEquipped(undefined, true)).toBe(true);
        expect(resolveEquipped(undefined, false)).toBe(false);
    });
});

describe('equipStar', () => {
    it('returns filled star when equipped', () => {
        expect(equipStar(true)).toBe('★');
    });

    it('returns empty star when not equipped', () => {
        expect(equipStar(false)).toBe('☆');
    });
});

describe('equipOpacity', () => {
    it('returns 1 when equipped', () => {
        expect(equipOpacity(true)).toBe('1');
    });

    it('returns 0.4 when not equipped', () => {
        expect(equipOpacity(false)).toBe('0.4');
    });
});

describe('normalizeGearInput', () => {
    it('defaults all fields from null', () => {
        const result = normalizeGearInput(null);
        expect(result.name).toBe('');
        expect(result.qty).toBe('1');
        expect(result.major).toBe('0');
        expect(result.collapsed).toBe(false);
    });

    it('preserves provided values', () => {
        const result = normalizeGearInput({ name: 'Sword', dmg: '2d6', collapsed: true });
        expect(result.name).toBe('Sword');
        expect(result.dmg).toBe('2d6');
        expect(result.collapsed).toBe(true);
    });

    it('defaults missing fields from partial input', () => {
        const result = normalizeGearInput({ name: 'Shield' });
        expect(result.range).toBe('');
        expect(result.feature).toBe('');
        expect(result.bonus).toBe('');
    });
});

describe('TRAIT_OPTIONS', () => {
    it('contains all six traits', () => {
        expect(TRAIT_OPTIONS).toContain('Agility');
        expect(TRAIT_OPTIONS).toContain('Strength');
        expect(TRAIT_OPTIONS).toContain('Finesse');
        expect(TRAIT_OPTIONS).toContain('Instinct');
        expect(TRAIT_OPTIONS).toContain('Presence');
        expect(TRAIT_OPTIONS).toContain('Knowledge');
    });

    it('has a blank default option', () => {
        expect(TRAIT_OPTIONS).toContain('value="">');
    });
});
