import { describe, it, expect } from 'vitest';
import { renderStars, parseFeatureText } from '../js/community/community-logic.js';

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
