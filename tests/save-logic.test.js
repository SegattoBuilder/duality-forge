import { describe, it, expect } from 'vitest';
import { buildExportFilename, getToastStyles, migrateWeapons, migrateArmor, DEFAULT_RESET } from '../js/character/save-logic.js';

describe('buildExportFilename', () => {
    it('builds filename with name and date', () => {
        expect(buildExportFilename('Gandalf', '2025-01-15')).toBe('Gandalf_2025-01-15.json');
    });

    it('falls back to character when name is empty', () => {
        expect(buildExportFilename('', '2025-01-15')).toBe('character_2025-01-15.json');
    });

    it('falls back to character when name is null', () => {
        expect(buildExportFilename(null, '2025-01-15')).toBe('character_2025-01-15.json');
    });
});

describe('getToastStyles', () => {
    it('returns scifi styles', () => {
        expect(getToastStyles('scifi')).toContain('#0d1220');
    });

    it('returns light styles', () => {
        expect(getToastStyles('light')).toContain('#fff');
    });

    it('returns dark styles as default', () => {
        expect(getToastStyles('dark')).toContain('#2a2418');
    });

    it('returns dark styles for fantasy', () => {
        expect(getToastStyles('fantasy')).toContain('#2a2418');
    });
});

describe('migrateWeapons', () => {
    it('migrates old weapon fields to array', () => {
        const fields = { wep1_name: 'Sword', wep1_trait: 't_str', wep1_range: 'Melee', wep1_dmg: '1d8', wep1_feature: 'Sharp' };
        const result = migrateWeapons(fields);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Sword');
        expect(result[0].equipped).toBe(true);
    });

    it('migrates two weapons, first equipped', () => {
        const fields = { wep1_name: 'Sword', wep2_name: 'Bow' };
        const result = migrateWeapons(fields);
        expect(result).toHaveLength(2);
        expect(result[0].equipped).toBe(true);
        expect(result[1].equipped).toBe(false);
    });

    it('returns empty array when no weapons', () => {
        expect(migrateWeapons({})).toHaveLength(0);
    });
});

describe('migrateArmor', () => {
    it('migrates old armor fields', () => {
        const fields = { armor_name: 'Plate', armor_thresh_major: '5', armor_thresh_severe: '10' };
        const result = migrateArmor(fields);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Plate');
        expect(result[0].equipped).toBe(true);
    });

    it('returns empty when no armor', () => {
        expect(migrateArmor({})).toHaveLength(0);
    });
});

describe('DEFAULT_RESET', () => {
    it('has expected default values', () => {
        expect(DEFAULT_RESET.charLevel).toBe('1');
        expect(DEFAULT_RESET.hp_max).toBe('6');
        expect(DEFAULT_RESET.stress_max).toBe('6');
        expect(DEFAULT_RESET.hope_max).toBe('6');
        expect(DEFAULT_RESET.armor_max).toBe('3');
        expect(DEFAULT_RESET.track_ev).toBe('10');
        expect(DEFAULT_RESET.thresh_major_extra).toBe('0');
        expect(DEFAULT_RESET.thresh_severe_extra).toBe('0');
    });
});
