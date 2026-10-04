// daggersearch/daggerheart-data (SRD 1.0, nested format) → our template
import { slug, recordId, en, blocksToText, feature, titleCase, kebab, asList } from '../lib.js';

export const DAGGERSEARCH_FILES = {
    ancestry: 'ancestries', armor: 'armors', class: 'classes', community: 'communities', consumable: 'consumables',
    'domain-card': 'domain-cards', item: 'items', rule: 'rules', subclass: 'subclasses', weapon: 'weapons',
};

const features = (list) => (list || []).map(f => feature(en(f.name), blocksToText(f.description)));

// Domain cards store their text as unnamed features; named ones get a bold lead-in
const featuresToText = (list) => (list || []).map(f => {
    const body = blocksToText(f.description);
    return en(f.name) ? `**${en(f.name)}:** ${body}` : body;
}).join('\n\n');

export function adaptDaggersearch(kind, data, { version, source }) {
    return asList(data).map(r => {
        const name = kind === 'class' ? titleCase(r.name) : en(r.name);
        const base = { id: recordId(kind, name), kind, name, slug: slug(name), srd: { version, source, ref: r.id } };
        switch (kind) {
            case 'domain-card':
                return { ...base, domain: `domain.${slug(r.domain)}`, cardType: kebab(r.type), level: r.level, recall: r.recallCost, text: featuresToText(r.features) };
            case 'weapon':
                return {
                    ...base, tier: r.tier, category: r.type === 'SECONDARY' ? 'secondary' : 'primary',
                    trait: kebab(r.trait), range: kebab(r.range),
                    damage: { count: 1, die: +String(r.damage.dice).replace(/\D/g, ''), bonus: r.damage.modifier || 0, type: { PHYSICAL: 'physical', MAGICAL: 'magic', PHYSICAL_OR_MAGICAL: 'either' }[r.damage.type] },
                    burden: kebab(r.burden), features: features(r.features),
                };
            case 'armor':
                return { ...base, tier: r.tier, thresholds: { major: r.baseMajorThreshold, severe: r.baseSevereThreshold }, score: r.baseScore, features: features(r.features) };
            case 'class':
                return {
                    ...base, description: blocksToText(r.description), domains: r.domains.map(d => `domain.${slug(d)}`),
                    evasion: r.startingEvasion, hp: r.startingHitPoints,
                    hopeFeature: feature(en(r.hopeFeature?.name), blocksToText(r.hopeFeature?.description), { kind: 'hope' }),
                    features: features(r.classFeatures), items: (r.classItems || []).map(en),
                    subclasses: [], // filled in by build.js from subclass.class
                };
            case 'subclass':
                return {
                    ...base, class: `class.${slug(r.class)}`, ...(r.spellcastTrait ? { spellcastTrait: kebab(r.spellcastTrait) } : {}),
                    foundation: features(r.foundation?.features), specialization: features(r.specialization?.features), mastery: features(r.mastery?.features),
                };
            case 'ancestry':
                return { ...base, description: blocksToText(r.description), features: features(r.features) };
            case 'community':
                return { ...base, description: blocksToText(r.description), traits: (r.personalities || []).map(en), features: features(r.features) };
            case 'item':
            case 'consumable':
                return { ...base, text: featuresToText(r.features) };
            case 'rule':
                return { ...base, text: blocksToText(r.description) };
            default:
                throw new Error(`daggersearch: unknown kind ${kind}`);
        }
    });
}
