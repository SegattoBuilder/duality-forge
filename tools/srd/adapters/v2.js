// v2 (SRD 2.0) — converts the flat JHerrin00/daggerheart-srd-2.0 format into our template
// (the same shape as v1). Only records whose name is NOT already in v1 are kept (see build.js).
import { loc, slug, upperEnum, int, mdToDescription, feature } from '../lib.js';

const id = (type, name) => `v2_${type}_${slug(name)}`;
const tag = (r) => ({ ...r, srdVersion: 2, source: 'srd2' });
const features = (list) => (Array.isArray(list) ? list.map(feature) : []);

// "d8+3 phy" | "d10 mag" | "d6+1 phy/mag" → { dice: 'D8', modifier: 3, type: 'PHYSICAL' }
export function parseDamage(s) {
    const m = String(s ?? '').trim().match(/^d(\d+)\s*(?:([+-])\s*(\d+))?\s+(phy\/mag|phy|mag)/i);
    if (!m) throw new Error(`Unparseable damage: "${s}"`);
    const type = { phy: 'PHYSICAL', mag: 'MAGICAL', 'phy/mag': 'PHYSICAL_OR_MAGICAL' }[m[4].toLowerCase()];
    return { dice: `D${m[1]}`, ...(m[3] ? { modifier: (m[2] === '-' ? -1 : 1) * int(m[3]) } : {}), type };
}

// "Duneborne are often adaptable, centered, collaborative, and observant." → ['adaptable', …]
export function parsePersonalities(note) {
    const m = String(note ?? '').match(/\bare often\s+(.+?)\.?$/i);
    if (!m) return [];
    return m[1].split(/,\s*|\s+and\s+/).map(s => s.replace(/^and\s+/, '').trim()).filter(Boolean).map(loc);
}

export const V2_FILES = {
    'domain-cards': 'abilities', weapons: 'weapons', armors: 'armor', classes: 'classes', subclasses: 'subclasses',
    ancestries: 'ancestries', communities: 'communities', consumables: 'consumables', items: 'items', rules: 'core_rules',
    transformations: 'transformations', adversaries: 'adversaries',
    // 2.0-only categories (no screens yet) — kept close to the source shape
    environments: 'environments', beastforms: 'beastforms', domains: 'domains', 'campaign-frames': 'campaign_frames', 'ancestry-rules': 'ancestry_rules',
};

export function adaptV2(category, rows, ctx = {}) {
    switch (category) {
        case 'domain-cards':
            return rows.map(r => tag({
                id: id('domain_card', r.name), name: loc(r.name), domain: upperEnum(r.domain), type: upperEnum(r.type),
                level: int(r.level), recallCost: int(r.recall) ?? 0, features: [{ description: mdToDescription(r.text) }],
            }));
        case 'weapons':
            return rows.map(r => tag({
                id: id('weapon', r.name), name: loc(r.name),
                type: /secondary/i.test(r.primary_or_secondary) ? 'SECONDARY' : /magic/i.test(r.physical_or_magical) ? 'PRIMARY_MAGIC' : 'PRIMARY_PHYSICAL',
                tier: int(r.tier), trait: upperEnum(r.trait), range: upperEnum(r.range), damage: parseDamage(r.damage),
                burden: upperEnum(r.burden), features: features(r.feature),
            }));
        case 'armors':
            return rows.map(r => {
                const [major, severe] = String(r.base_thresholds).split('/').map(int);
                return tag({ id: id('armor', r.name), name: loc(r.name), tier: int(r.tier), baseMajorThreshold: major, baseSevereThreshold: severe, baseScore: int(r.base_score), features: features(r.feature) });
            });
        case 'classes':
            return rows.map(r => tag({
                id: id('class', r.name), name: upperEnum(r.name), description: mdToDescription(r.description),
                domains: [upperEnum(r.domain_1), upperEnum(r.domain_2)], startingEvasion: int(r.evasion), startingHitPoints: int(r.hp),
                hopeFeature: { name: loc(r.hope_feature_name), description: mdToDescription(r.hope_feature_text) },
                classFeatures: features(r.feature), classItems: r.items ? [loc(r.items)] : [],
                backgroundQuestions: (r.background || []).map(q => loc(q.question)),
                connectionQuestions: (r.connection || []).map(q => loc(q.question)),
            }));
        case 'subclasses':
            // 2.0 subclass rows don't name their class — look it up from the classes list
            return rows.map(r => {
                const cls = (ctx.classes || []).find(c => [c.subclass_1, c.subclass_2].includes(r.name));
                if (!cls) throw new Error(`Subclass "${r.name}" has no class in classes.json`);
                return tag({
                    id: id('subclass', r.name), name: loc(r.name), class: upperEnum(cls.name),
                    domains: [upperEnum(cls.domain_1), upperEnum(cls.domain_2)],
                    ...(r.spellcast_trait ? { spellcastTrait: upperEnum(r.spellcast_trait) } : {}),
                    ...(r.description ? { description: mdToDescription(r.description) } : {}),
                    foundation: { features: features(r.foundation) }, specialization: { features: features(r.specialization) }, mastery: { features: features(r.mastery) },
                });
            });
        case 'ancestries':
            return rows.map(r => tag({ id: id('ancestry', r.name), name: loc(r.name), description: mdToDescription(r.description), features: features(r.feature) }));
        case 'communities':
            return rows.map(r => tag({ id: id('community', r.name), name: loc(r.name), description: mdToDescription(r.description), personalities: parsePersonalities(r.note), features: features(r.feature) }));
        case 'consumables':
        case 'items':
            return rows.map(r => tag({ id: id(category === 'items' ? 'item' : 'consumable', r.name), name: loc(r.name), ...(r.roll ? { roll: String(r.roll) } : {}), features: [{ description: mdToDescription(r.description) }] }));
        case 'rules':
        case 'transformations':
            return rows.map(r => tag({ id: id(category === 'rules' ? 'rule' : 'transformation', r.name), name: loc(r.name), description: mdToDescription(r.text), ...(category === 'transformations' ? { features: [] } : {}) }));
        case 'adversaries':
            return rows.map(r => tag({ id: id('adversary', r.name), ...r }));
        default:
            // 2.0-only categories: keep the source fields, add id + version
            return rows.map(r => tag({ id: id(category.replace(/-/g, '_').replace(/s$/, ''), r.name), ...r }));
    }
}
