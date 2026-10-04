// Flat SRD format (seansbox/daggerheart-srd for SRD 1.0 adversaries, JHerrin00/daggerheart-srd-2.0 for SRD 2.0)
// → our template. Both repos share this format, so v1 and v2 adversaries go through the same code.
import { slug, recordId, int, kebab, text, feature, splitList, parseDamage, parseThresholds, parseExperiences, asList } from '../lib.js';

export const FLAT_FILES = {
    'domain-card': 'abilities', weapon: 'weapons', armor: 'armor', class: 'classes', subclass: 'subclasses',
    ancestry: 'ancestries', community: 'communities', consumable: 'consumables', item: 'items', rule: 'core_rules',
    transformation: 'transformations', adversary: 'adversaries', environment: 'environments', beastform: 'beastforms',
    domain: 'domains', 'campaign-frame': 'campaign_frames', 'ancestry-rule': 'ancestry_rules',
};

const features = (list) => (Array.isArray(list) ? list : []).map(f => feature(f.name, f.text, f.question ? { question: text(f.question) } : {}));

// "Horde (3/HP)" → { role: 'horde', hordeHp: 3 }
function parseRole(s) {
    const m = String(s ?? '').match(/^([A-Za-z]+)(?:\s*\((\d*)\/HP\))?/);
    return { role: kebab(m?.[1] ?? s), ...(m?.[2] !== undefined ? { hordeHp: m[2] ? +m[2] : null } : {}) };
}

// "Darkweave Spiders (Darkweave *Crawler, Spinner*), Any" → ['Darkweave Crawler', 'Spinner', 'Any'] (names only)
export function parseAdversaryNames(s) {
    const clean = String(s ?? '').replace(/[*_]/g, '');
    const names = [];
    for (const group of clean.split(/,(?![^(]*\))/)) {
        const inner = group.match(/\(([^)]*)\)/);
        (inner ? inner[1].split(',') : [group]).forEach(n => { const t = n.trim(); if (t) names.push(t); });
    }
    return names;
}

export function adaptFlat(kind, rows, { version, source, classes = [] }) {
    return asList(rows).map(r => {
        const base = { id: recordId(kind, r.name), kind, name: String(r.name).trim(), slug: slug(r.name), srd: { version, source, ref: r.name } };
        switch (kind) {
            case 'domain-card':
                return { ...base, domain: `domain.${slug(r.domain)}`, cardType: kebab(r.type), level: int(r.level), recall: int(r.recall) ?? 0, text: text(r.text) };
            case 'weapon':
                return {
                    ...base, tier: int(r.tier), category: /secondary/i.test(r.primary_or_secondary) ? 'secondary' : 'primary',
                    trait: kebab(r.trait), range: kebab(r.range), damage: parseDamage(r.damage), burden: kebab(r.burden),
                    ...(/wheelchair/i.test(r.name) ? { variant: 'combat-wheelchair' } : {}), features: features(r.feature),
                };
            case 'armor':
                return { ...base, tier: int(r.tier), thresholds: parseThresholds(String(r.base_thresholds).replace(/\s/g, '')), score: int(r.base_score), features: features(r.feature) };
            case 'class':
                return {
                    ...base, description: text(r.description), domains: [r.domain_1, r.domain_2].map(d => `domain.${slug(d)}`),
                    evasion: int(r.evasion), hp: int(r.hp),
                    hopeFeature: feature(r.hope_feature_name, r.hope_feature_text, { kind: 'hope' }),
                    features: features(r.feature), items: r.items ? [text(r.items)] : [],
                    subclasses: [r.subclass_1, r.subclass_2].filter(Boolean).map(n => recordId('subclass', n)),
                    questions: { background: (r.background || []).map(q => text(q.question)), connection: (r.connection || []).map(q => text(q.question)) },
                };
            case 'subclass': {
                // flat subclass rows don't name their class — look it up from the class list
                const cls = classes.find(c => [c.subclass_1, c.subclass_2].includes(r.name));
                if (!cls) throw new Error(`Subclass "${r.name}" has no class in classes.json`);
                return {
                    ...base, class: recordId('class', cls.name), ...(r.spellcast_trait ? { spellcastTrait: kebab(r.spellcast_trait) } : {}),
                    ...(r.description ? { description: text(r.description) } : {}),
                    foundation: features(r.foundation), specialization: features(r.specialization), mastery: features(r.mastery),
                };
            }
            case 'ancestry':
                return { ...base, description: text(r.description), features: features(r.feature) };
            case 'community': {
                const m = String(r.note ?? '').match(/\bare often\s+(.+?)\.?$/i);
                const traits = m ? m[1].split(/,\s*|\s+and\s+/).map(s => s.replace(/^and\s+/, '').trim()).filter(Boolean) : [];
                return { ...base, description: text(r.description), traits, features: features(r.feature) };
            }
            case 'item':
            case 'consumable':
                return { ...base, text: text(r.description), ...(r.roll ? { roll: int(r.roll) } : {}) };
            case 'rule':
            case 'transformation':
            case 'campaign-frame':
            case 'ancestry-rule':
                return { ...base, text: text(r.text) };
            case 'adversary':
                return {
                    ...base, tier: int(r.tier), ...parseRole(r.type), difficulty: int(r.difficulty),
                    thresholds: parseThresholds(r.thresholds), hp: int(r.hp), stress: int(r.stress),
                    attack: {
                        name: String(r.attack ?? '').trim(),
                        ...(/^[+-]\d+$/.test(String(r.atk).trim()) ? { bonus: int(r.atk) } : { bonusText: String(r.atk ?? '').trim() }),
                        range: kebab(r.range), damage: parseDamage(r.damage),
                    },
                    experiences: parseExperiences(r.experience), motives: splitList(r.motives_and_tactics),
                    description: text(r.description), features: features(r.feature),
                };
            case 'environment':
                return {
                    ...base, tier: int(r.tier), envType: kebab(r.type), difficulty: int(r.difficulty) ?? r.difficulty ?? null,
                    impulses: splitList(r.impulses), description: text(r.description),
                    adversariesText: String(r.potential_adversaries ?? '').replace(/[*_]/g, '').trim(),
                    adversaries: [], // resolved to ids by build.js
                    features: features(r.feature),
                };
            case 'beastform': {
                const tb = String(r.trait_bonus ?? '').match(/^(\w+)\s*([+-]\d+)/);
                const atk = String(r.attack ?? '').match(/^(Melee|Very Close|Close|Far|Very Far)\s+(\w+)\s+(.*)$/i);
                return {
                    ...base, tier: int(r.tier),
                    examples: String(r.examples ?? '').replace(/[()]/g, '').split(/,\s*/).map(s => s.trim()).filter(s => s && !/^etc\.?$/i.test(s)),
                    traitBonus: tb ? { trait: kebab(tb[1]), bonus: +tb[2] } : null, evasionBonus: int(r.evasion_bonus),
                    attack: atk ? { range: kebab(atk[1]), trait: kebab(atk[2]), damage: parseDamage(atk[3]) } : null,
                    advantages: splitList(r.advantages), features: features(r.feature),
                };
            }
            case 'domain':
                return { ...base, description: text(r.description), cards: (r.card || []).map(level => level.map(n => recordId('domain-card', n))) };
            default:
                throw new Error(`flat: unknown kind ${kind}`);
        }
    });
}
