import { describe, it, expect } from 'vitest';
import { renderStars, parseFeatureText, filterChapters, filterAdversaries, filterHomebrew } from '../js/community/community-logic.js';

describe('renderStars', () => {
    it('renders 5 filled stars for rating 5', () => {
        expect(renderStars(5)).toContain('★★★★★');
    });

    it('renders 0 filled stars for rating 0', () => {
        expect(renderStars(0)).toContain('☆☆☆☆☆');
    });

    it('rounds to nearest star', () => {
        expect(renderStars(3.4)).toContain('★★★☆☆');
        expect(renderStars(3.5)).toContain('★★★★☆');
    });

    it('wraps in accent-colored span', () => {
        expect(renderStars(1)).toContain('text-[#d4a017]');
    });
});

describe('parseFeatureText', () => {
    it('parses colon-separated features', () => {
        const result = parseFeatureText('Rage: Get angry\nStrike: Hit hard');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Rage', text: 'Get angry' });
        expect(result[1]).toEqual({ name: 'Strike', text: 'Hit hard' });
    });

    it('handles features without colon', () => {
        expect(parseFeatureText('Simple')[0]).toEqual({ name: 'Simple', text: '' });
    });

    it('returns empty for falsy', () => {
        expect(parseFeatureText('')).toEqual([]);
        expect(parseFeatureText(null)).toEqual([]);
    });

    it('filters blank lines', () => {
        expect(parseFeatureText('A: 1\n\nB: 2')).toHaveLength(2);
    });
});

describe('filterChapters', () => {
    const chapters = [
        { title: 'Dragon Hunt', author_nickname: 'DM1', description: 'Epic battle', environment: 'Forest', difficulty: 'Hard', duration: 'Long', avg_rating: 4, import_count: 10 },
        { title: 'Tavern Brawl', author_nickname: 'DM2', description: 'Bar fight', environment: 'Urban', difficulty: 'Easy', duration: 'Short', avg_rating: 2, import_count: 20 },
    ];

    it('returns all with no filters', () => {
        expect(filterChapters(chapters, {})).toHaveLength(2);
    });

    it('filters by search in title', () => {
        expect(filterChapters(chapters, { search: 'dragon' })).toHaveLength(1);
    });

    it('filters by environment', () => {
        expect(filterChapters(chapters, { env: 'Urban' })).toHaveLength(1);
    });

    it('filters by difficulty', () => {
        expect(filterChapters(chapters, { diff: 'Hard' })).toHaveLength(1);
    });

    it('filters by duration', () => {
        expect(filterChapters(chapters, { dur: 'Short' })).toHaveLength(1);
    });

    it('sorts by rating', () => {
        const result = filterChapters(chapters, { sort: 'rating' });
        expect(result[0].title).toBe('Dragon Hunt');
    });

    it('sorts by popular', () => {
        const result = filterChapters(chapters, { sort: 'popular' });
        expect(result[0].title).toBe('Tavern Brawl');
    });
});

describe('filterAdversaries', () => {
    const adversaries = [
        { title: 'Orc', author_nickname: 'DM1', description: 'Green', adv_type: 'Monster', tier: '2', difficulty: '12', avg_rating: 3, import_count: 5 },
        { title: 'Bandit', author_nickname: 'DM2', description: 'Human', adv_type: 'Humanoid', tier: '1', difficulty: '8', avg_rating: 5, import_count: 1 },
    ];

    it('returns all with no filters', () => {
        expect(filterAdversaries(adversaries, {})).toHaveLength(2);
    });

    it('filters by type', () => {
        expect(filterAdversaries(adversaries, { type: 'Monster' })).toHaveLength(1);
    });

    it('filters by tier range', () => {
        expect(filterAdversaries(adversaries, { tierMin: 2, tierMax: null })).toHaveLength(1);
    });

    it('filters by difficulty range', () => {
        expect(filterAdversaries(adversaries, { diffMin: null, diffMax: 10 })).toHaveLength(1);
    });

    it('sorts by rating', () => {
        const result = filterAdversaries(adversaries, { sort: 'rating' });
        expect(result[0].title).toBe('Bandit');
    });
});

describe('filterHomebrew', () => {
    const homebrews = [
        { title: 'Fire Bolt', author_nickname: 'A', description: 'Spell', card_type: 'domain-card', card_category: '', card_data: { domain: 'ARCANA' }, avg_rating: 4, import_count: 3 },
        { title: 'Elf', author_nickname: 'B', description: 'Race', card_type: 'general', card_category: 'ancestries', card_data: {}, avg_rating: 2, import_count: 7 },
    ];

    it('returns all with no filters', () => {
        expect(filterHomebrew(homebrews, {})).toHaveLength(2);
    });

    it('filters by card type', () => {
        expect(filterHomebrew(homebrews, { type: 'domain-card' })).toHaveLength(1);
    });

    it('filters by category', () => {
        expect(filterHomebrew(homebrews, { cat: 'ancestries' })).toHaveLength(1);
    });

    it('filters by domain', () => {
        expect(filterHomebrew(homebrews, { domain: 'ARCANA' })).toHaveLength(1);
    });

    it('sorts by popular', () => {
        const result = filterHomebrew(homebrews, { sort: 'popular' });
        expect(result[0].title).toBe('Elf');
    });
});
