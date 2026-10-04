import { describe, it, expect } from 'vitest';
import { renderText, renderFeatures, plainText } from '../js/core/text.js';
import { htmlToText, htmlToFeatures, upgradeSheetCard, toEnemyData, cardFromDomainCard, cardsFromClass, splitFeatureName } from '../js/core/srd-legacy.js';
import { formatDice, formatDamage, label, domainKey } from '../js/core/srd.js';

describe('renderText (Markdown-lite, escape first)', () => {
    it('paragraphs, bold, italic', () => {
        expect(renderText('Spend a **Hope**.\n\nMake them _Vulnerable_.')).toBe('<p>Spend a <strong>Hope</strong>.</p><p>Make them <em>Vulnerable</em>.</p>');
    });
    it('lists and headings', () => {
        expect(renderText('On a success:\n- deal **d6**\n- move')).toBe('<p>On a success:</p><ul class="md-list"><li>deal <strong>d6</strong></li><li>move</li></ul>');
        expect(renderText('## Core Mechanics')).toBe('<p class="md-heading"><strong>Core Mechanics</strong></p>');
    });
    it('tables', () => {
        const html = renderText('| Difficulty | Feel |\n|---|---|\n| 10 | Easy |');
        expect(html).toContain('<thead><tr><th>Difficulty</th><th>Feel</th></tr></thead>');
        expect(html).toContain('<td>10</td><td>Easy</td>');
    });
    it('never outputs HTML from the input', () => {
        const evil = '<img src=x onerror=alert(1)> **<script>x</script>** | <b>t</b> |\n- <a href="javascript:1">l</a>';
        const html = renderText(evil);
        expect(html).not.toMatch(/<img|<script|<a |<b>/);
        expect(html).toContain('&lt;img');
    });
    it('does not italicise snake_case or math', () => {
        expect(renderText('use some_var_name and 2*3*4')).toBe('<p>use some_var_name and 2*3*4</p>');
    });
    it('features with kind chips', () => {
        const html = renderFeatures([{ name: 'Relentless', kind: 'passive', value: 3, text: 'Again.' }]);
        expect(html).toContain('feature-kind-passive');
        expect(html).toContain('passive 3');
    });
    it('plain text for search', () => {
        expect(plainText('**Bold** _it_\n- item')).toBe('Bold it item');
    });
});

describe('display helpers', () => {
    it('dice and damage', () => {
        expect(formatDice({ count: 1, die: 8, bonus: 3 })).toBe('d8+3');
        expect(formatDice({ count: 2, die: 6, bonus: 0 })).toBe('2d6');
        expect(formatDice({ count: 0, die: 0, bonus: 3 })).toBe('3');
        expect(formatDamage({ count: 1, die: 12, bonus: 2, type: 'physical' })).toBe('d12+2 phy');
    });
    it('labels', () => {
        expect(label('very-close')).toBe('Very Close');
        expect(domainKey('domain.arcana')).toBe('ARCANA');
    });
});

describe('old saves → v2 sheet cards', () => {
    const catalog = {
        'domain-card': [{ id: 'domain-card.rune-ward', name: 'Rune Ward', srd: { version: 1 } }],
        class: [{ id: 'class.bard', name: 'Bard', srd: { version: 1 } }],
    };
    it('html → Markdown-lite', () => {
        expect(htmlToText('<p>One &amp; two</p><p>• a</p><p>• b</p>')).toBe('One & two\n\n- a\n- b');
        expect(htmlToText('<strong>x</strong><br>y')).toBe('**x**\ny');
    });
    it('feature html → features', () => {
        const html = '<div class="text-[11px] font-bold text-amber-400 mt-1">Ward</div><div class="text-[11px] text-zinc-400 leading-relaxed"><p>Reduce damage.</p></div>';
        expect(htmlToFeatures(html)).toEqual([{ name: 'Ward', text: 'Reduce damage.' }]);
        expect(htmlToFeatures('<div class="text-[11px] text-zinc-400">Just text</div>')).toEqual([{ name: '', text: 'Just text' }]);
    });
    it('matches SRD cards and marks them v1; keeps text', () => {
        const up = upgradeSheetCard({ name: 'Rune Ward', desc: '<p>Old text</p>', feature: '', category: 'domain-cards.json', domain: 'ARCANA', type: 'SPELL', level: 1, recallCost: 0, collapsed: true }, catalog);
        expect(up).toMatchObject({ v: 2, ref: 'domain-card.rune-ward', srdVersion: 1, text: 'Old text', domain: 'ARCANA', collapsed: true });
        expect(upgradeSheetCard(up, catalog)).toBe(up);   // idempotent
    });
    it('class feature cards match by class name prefix', () => {
        const up = upgradeSheetCard({ name: 'BARD — Hope Feature: Make a Scene', desc: '', feature: '', category: 'classes.json' }, catalog);
        expect(up.ref).toBe('class.bard');
    });
    it('homebrew and unknown cards stay custom', () => {
        expect(upgradeSheetCard({ name: 'My Card', desc: 'x', feature: '', category: 'domain-cards.json', _homebrew: true }, catalog)).toMatchObject({ ref: null, srdVersion: null, _homebrew: true });
        expect(upgradeSheetCard({ name: 'Mystery', desc: '', feature: '', category: 'domain-cards.json' }, catalog).ref).toBe(null);
    });
});

describe('catalog → sheet / DM shapes', () => {
    it('domain card', () => {
        expect(cardFromDomainCard({ id: 'domain-card.blighting-strike', name: 'Blighting Strike', srd: { version: 2 }, domain: 'domain.dread', cardType: 'spell', level: 1, recall: 1, text: 'x' }))
            .toMatchObject({ ref: 'domain-card.blighting-strike', srdVersion: 2, domain: 'DREAD', type: 'SPELL', recallCost: 1, category: 'domain-cards.json' });
    });
    it('class → one card per feature', () => {
        const cards = cardsFromClass({ id: 'class.bard', name: 'Bard', srd: { version: 1 }, domains: ['domain.grace', 'domain.codex'], hopeFeature: { name: 'Make a Scene', text: 'a' }, features: [{ name: 'Rally', text: 'b' }] });
        expect(cards.map(c => c.name)).toEqual(['Bard — Hope Feature: Make a Scene', 'Bard — Class Feature: Rally']);
        expect(cards[0].classInfo).toBe('GRACE / CODEX');
    });
    it('adversary → enemyData keeps the tracker format', () => {
        const ed = toEnemyData({
            id: 'adversary.acid-burrower', name: 'Acid Burrower', srd: { version: 1 }, tier: 1, role: 'horde', hordeHp: 3, difficulty: 14,
            thresholds: { major: 8, severe: null }, hp: 8, stress: null,
            attack: { name: 'Claws', bonus: 3, range: 'very-close', damage: { count: 1, die: 12, bonus: 2, type: 'physical' } },
            experiences: [{ name: 'Tremor Sense', bonus: 2 }], motives: ['Burrow', 'feed'], description: 'Bug',
            features: [{ name: 'Relentless', kind: 'passive', value: 3, text: 't' }],
        });
        expect(ed).toMatchObject({ ref: 'adversary.acid-burrower', srdVersion: 1, tier: '1', type: 'Horde (3/HP)', thresholds: '8/None', stress: 'None', atk: '+3', range: 'Very Close', damage: '1d12+2 phy', experience: 'Tremor Sense +2', motives_and_tactics: 'Burrow, feed' });
        expect(ed.feature[0].name).toBe('Relentless (3) - Passive');
        expect(splitFeatureName(ed.feature[0].name)).toEqual({ name: 'Relentless', kind: 'passive', value: '3' });
    });
});
