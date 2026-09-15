import { describe, it, expect } from 'vitest';
import { formatRelativeDate, detectJsonType } from '../js/core/dashboard-logic.js';

describe('detectJsonType', () => {
    it('detects character JSON', () => {
        expect(detectJsonType({ fields: { charName: 'Test' } })).toBe('character');
        expect(detectJsonType({ cards: [] })).toBe('character');
    });

    it('detects table JSON', () => {
        expect(detectJsonType({ creatures: [] })).toBe('table');
        expect(detectJsonType({ vaultCreatures: [], chronicleEntries: [] })).toBe('table');
    });

    it('detects nested data wrapper', () => {
        expect(detectJsonType({ data: { fields: {} } })).toBe('character');
        expect(detectJsonType({ data: { creatures: [] } })).toBe('table');
    });

    it('returns null for unknown', () => {
        expect(detectJsonType({})).toBeNull();
        expect(detectJsonType(null)).toBeNull();
    });
});

describe('formatRelativeDate', () => {
    it('returns "just now" for recent dates', () => {
        expect(formatRelativeDate(new Date().toISOString())).toBe('just now');
    });

    it('returns minutes for recent past', () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
        expect(formatRelativeDate(fiveMinAgo)).toBe('5m ago');
    });

    it('returns hours for same-day past', () => {
        const threeHrsAgo = new Date(Date.now() - 3 * 3600000).toISOString();
        expect(formatRelativeDate(threeHrsAgo)).toBe('3h ago');
    });

    it('returns days for recent past', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
        expect(formatRelativeDate(twoDaysAgo)).toBe('2d ago');
    });
});
