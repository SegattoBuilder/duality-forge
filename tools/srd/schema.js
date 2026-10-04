// Duality Forge SRD data template — every record in data/srd/*.json must match this.
// Written for this project (shape compatible with SRD 1.0 data the app already uses).
// Exported as JSON Schema 2020-12; build.js writes it to data/schema/srd.schema.json.

const str = { type: 'string' };
const int = { type: 'integer' };
const loc = { type: 'object', properties: { 'en-US': str }, required: ['en-US'], additionalProperties: false };
const description = {
    type: 'array', minItems: 1,
    items: {
        type: 'object', additionalProperties: false,
        properties: { paragraph: loc, list: { type: 'array', items: loc, minItems: 1 } },
        oneOf: [{ required: ['paragraph'] }, { required: ['list'] }],
    },
};
const feature = { type: 'object', properties: { name: loc, description }, required: ['description'], additionalProperties: false };
const features = { type: 'array', items: feature };
const domain = { enum: ['ARCANA', 'BLADE', 'BONE', 'CODEX', 'DREAD', 'GRACE', 'MIDNIGHT', 'SAGE', 'SPLENDOR', 'VALOR'] };
const className = { enum: ['ASSASSIN', 'BARD', 'BRAWLER', 'DRUID', 'GUARDIAN', 'RANGER', 'ROGUE', 'SERAPH', 'SORCERER', 'WARLOCK', 'WARRIOR', 'WITCH', 'WIZARD'] };
const trait = { enum: ['AGILITY', 'STRENGTH', 'FINESSE', 'INSTINCT', 'PRESENCE', 'KNOWLEDGE', 'SPELLCAST'] };
const tier = { type: 'integer', minimum: 1, maximum: 4 };
const tierFeatures = { type: 'object', properties: { features: { ...features, minItems: 1 } }, required: ['features'], additionalProperties: false };

// Fields every record carries
const base = {
    id: { type: 'string', pattern: '^[a-z0-9_]+$' },
    srdVersion: { enum: [1, 2] },
    source: { enum: ['daggersearch', 'seansbox', 'srd2'] },
};
const record = (props, required, extra = false) => ({
    type: 'object',
    properties: { ...base, ...props },
    required: ['id', 'srdVersion', 'source', ...required],
    additionalProperties: extra,
});

const adversary = record({
    name: str, tier: str, type: str, description: str, motives_and_tactics: str, difficulty: str, thresholds: str,
    hp: str, stress: str, atk: str, attack: str, range: str, damage: str, experience: str,
    feature: { type: 'array', items: { type: 'object', properties: { name: str, text: str }, required: ['name'] } },
}, ['name'], true);

export const CATEGORY_SCHEMAS = {
    'domain-cards': record({ name: loc, domain, type: { enum: ['ABILITY', 'SPELL', 'GRIMOIRE'] }, level: { type: 'integer', minimum: 1, maximum: 10 }, recallCost: { type: 'integer', minimum: 0 }, features: { ...features, minItems: 1 } }, ['name', 'domain', 'type', 'level', 'recallCost', 'features']),
    weapons: record({ name: loc, type: { enum: ['PRIMARY_PHYSICAL', 'PRIMARY_MAGIC', 'SECONDARY'] }, tier, trait, range: { enum: ['MELEE', 'VERY_CLOSE', 'CLOSE', 'FAR', 'VERY_FAR'] }, damage: { type: 'object', properties: { dice: { enum: ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'] }, modifier: int, type: { enum: ['PHYSICAL', 'MAGICAL', 'PHYSICAL_OR_MAGICAL'] } }, required: ['dice', 'type'], additionalProperties: false }, burden: { enum: ['ONE_HANDED', 'TWO_HANDED'] }, features }, ['name', 'type', 'tier', 'trait', 'range', 'damage', 'burden']),
    armors: record({ name: loc, tier, baseMajorThreshold: int, baseSevereThreshold: int, baseScore: int, features }, ['name', 'tier', 'baseMajorThreshold', 'baseSevereThreshold', 'baseScore']),
    classes: record({ name: className, description, domains: { type: 'array', items: domain, minItems: 2, maxItems: 2 }, startingEvasion: int, startingHitPoints: int, hopeFeature: feature, classFeatures: { ...features, minItems: 1 }, classItems: { type: 'array', items: loc }, backgroundQuestions: { type: 'array', items: loc }, connectionQuestions: { type: 'array', items: loc } }, ['name', 'description', 'domains', 'startingEvasion', 'startingHitPoints', 'hopeFeature', 'classFeatures', 'classItems']),
    subclasses: record({ name: loc, class: className, domains: { type: 'array', items: domain, minItems: 2, maxItems: 2 }, spellcastTrait: trait, description, foundation: tierFeatures, specialization: tierFeatures, mastery: tierFeatures }, ['name', 'class', 'domains', 'foundation', 'specialization', 'mastery']),
    // features may be empty: 2.0 has umbrella entries (e.g. "Elemental Kin" introduces the four kin ancestries)
    ancestries: record({ name: loc, description, features }, ['name', 'description', 'features']),
    communities: record({ name: loc, description, personalities: { type: 'array', items: loc }, features: { ...features, minItems: 1 } }, ['name', 'description', 'personalities', 'features']),
    consumables: record({ name: loc, roll: str, features: { ...features, minItems: 1 } }, ['name', 'features']),
    items: record({ name: loc, roll: str, features: { ...features, minItems: 1 } }, ['name', 'features']),
    rules: record({ name: loc, description }, ['name', 'description']),
    transformations: record({ name: loc, description, features }, ['name', 'description', 'features']),
    adversaries: adversary,
    // 2.0-only categories: source shape, only identity is enforced
    environments: record({ name: str }, ['name'], true),
    beastforms: record({ name: str }, ['name'], true),
    domains: record({ name: str }, ['name'], true),
    'campaign-frames': record({ name: str, text: str }, ['name', 'text'], true),
    'ancestry-rules': record({ name: str, text: str }, ['name', 'text'], true),
};

export const SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://duality-forge.pages.dev/data/schema/srd.schema.json',
    title: 'Duality Forge SRD data',
    description: 'One file per category in data/srd/ — each is an array of records matching $defs[category].',
    $defs: CATEGORY_SCHEMAS,
};
