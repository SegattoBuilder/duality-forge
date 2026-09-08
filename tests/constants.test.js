import { describe, it, expect } from 'vitest';
import * as C from '../js/core/constants.js';

describe('constants', () => {
    it('exports all localStorage keys as strings', () => {
        const lsKeys = Object.entries(C).filter(([k]) => k.startsWith('LS_'));
        expect(lsKeys.length).toBeGreaterThan(0);
        lsKeys.forEach(([k, v]) => expect(typeof v).toBe('string'));
    });

    it('exports all table names as strings', () => {
        const tables = Object.entries(C).filter(([k]) => k.startsWith('TABLE_'));
        expect(tables.length).toBeGreaterThan(0);
        tables.forEach(([k, v]) => expect(typeof v).toBe('string'));
    });

    it('has no duplicate localStorage key values', () => {
        const lsKeys = Object.entries(C).filter(([k]) => k.startsWith('LS_'));
        const values = lsKeys.map(([, v]) => v);
        const unique = new Set(values);
        const dupes = values.filter((v, i) => values.indexOf(v) !== i);
        if (dupes.length) {
            const dupeEntries = lsKeys.filter(([, v]) => dupes.includes(v));
            throw new Error(`Duplicate LS values: ${dupeEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
    });

    it('has no duplicate table name values', () => {
        const tables = Object.entries(C).filter(([k]) => k.startsWith('TABLE_'));
        const values = tables.map(([, v]) => v);
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
    });

    it('timer constants are positive numbers', () => {
        expect(C.TOAST_DURATION).toBeGreaterThan(0);
        expect(C.SYNC_STATUS_DURATION).toBeGreaterThan(0);
        expect(C.AUTOSAVE_INTERVAL).toBeGreaterThan(0);
    });

    it('password min length is reasonable', () => {
        expect(C.PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(6);
    });
});
