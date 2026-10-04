// Duality Forge SRD data template (schemaVersion 2) — see docs/srd-schema.md
// Every record in data/srd/<dataVersion>/<kind>.json must match KIND_SCHEMAS[kind].
// build.js also writes this to data/schema/srd.schema.json.

export const SCHEMA_VERSION = 2;

const str = { type: 'string' };
const text = { type: 'string', maxLength: 60000 };          // Markdown-lite, no HTML (checked separately)
const int = { type: 'integer' };
const nint = { type: ['integer', 'null'] };
const strList = { type: 'array', items: str };
const ref = (kind) => ({ type: 'string', pattern: `^${kind}\\.[a-z0-9-]+$` });
const refList = (kind) => ({ type: 'array', items: ref(kind) });

const trait = { enum: ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge', 'spellcast'] };
const range = { enum: ['melee', 'very-close', 'close', 'far', 'very-far'] };
const tier = { type: 'integer', minimum: 1, maximum: 4 };

const damage = {
    type: 'object', additionalProperties: false, required: ['count', 'die', 'bonus', 'type'],
    properties: { count: { type: 'integer', minimum: 0 }, die: { enum: [0, 4, 6, 8, 10, 12, 20] }, bonus: int, type: { enum: ['physical', 'magic', 'either'] }, direct: { const: true } },
};
const feature = {
    type: 'object', additionalProperties: false, required: ['name', 'text'],
    properties: {
        name: str, text,
        kind: { enum: ['passive', 'action', 'reaction', 'evolution', 'hope'] },
        value: { type: ['integer', 'string'] },
        question: str,
    },
};
const features = { type: 'array', items: feature };
const thresholds = { type: ['object', 'null'], additionalProperties: false, required: ['major', 'severe'], properties: { major: nint, severe: nint } };

const envelope = {
    id: { type: 'string', pattern: '^[a-z-]+\\.[a-z0-9-]+$' },
    kind: str,
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
    srd: {
        type: 'object', additionalProperties: false, required: ['version', 'source', 'ref'],
        properties: { version: { enum: [1, 2] }, source: { enum: ['daggersearch', 'seansbox', 'srd2'] }, ref: str },
    },
    tags: strList,
};
const record = (kind, props, required = []) => ({
    type: 'object', additionalProperties: false,
    properties: { ...envelope, kind: { const: kind }, ...props },
    required: ['id', 'kind', 'name', 'slug', 'srd', ...required],
});

export const KIND_SCHEMAS = {
    'domain-card': record('domain-card', { domain: ref('domain'), cardType: { enum: ['ability', 'spell', 'grimoire'] }, level: { type: 'integer', minimum: 1, maximum: 10 }, recall: { type: 'integer', minimum: 0 }, text }, ['domain', 'cardType', 'level', 'recall', 'text']),
    weapon: record('weapon', { tier, category: { enum: ['primary', 'secondary'] }, variant: { enum: ['core', 'combat-wheelchair'] }, trait, range, damage, burden: { enum: ['one-handed', 'two-handed'] }, features }, ['tier', 'category', 'trait', 'range', 'damage', 'burden', 'features']),
    armor: record('armor', { tier, thresholds, score: int, features }, ['tier', 'thresholds', 'score', 'features']),
    class: record('class', {
        description: text, domains: { ...refList('domain'), minItems: 2, maxItems: 2 }, evasion: int, hp: int, hopeFeature: feature, features, items: strList,
        subclasses: refList('subclass'),
        questions: { type: 'object', additionalProperties: false, properties: { background: strList, connection: strList } },
    }, ['description', 'domains', 'evasion', 'hp', 'hopeFeature', 'features', 'items', 'subclasses']),
    subclass: record('subclass', { class: ref('class'), spellcastTrait: trait, description: text, foundation: features, specialization: features, mastery: features }, ['class', 'foundation', 'specialization', 'mastery']),
    ancestry: record('ancestry', { description: text, features }, ['description', 'features']),
    community: record('community', { description: text, traits: strList, features }, ['description', 'traits', 'features']),
    item: record('item', { text, roll: int }, ['text']),
    consumable: record('consumable', { text, roll: int }, ['text']),
    rule: record('rule', { text }, ['text']),
    transformation: record('transformation', { text }, ['text']),
    'campaign-frame': record('campaign-frame', { text }, ['text']),
    'ancestry-rule': record('ancestry-rule', { text }, ['text']),
    adversary: record('adversary', {
        tier, role: { enum: ['bruiser', 'horde', 'leader', 'minion', 'ranged', 'skulk', 'social', 'solo', 'standard', 'support'] }, hordeHp: nint,
        difficulty: int, thresholds, hp: int, stress: nint,
        attack: { type: 'object', additionalProperties: false, required: ['name', 'range', 'damage'], properties: { name: str, bonus: int, bonusText: str, range, damage } },
        experiences: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'bonus'], properties: { name: str, bonus: nint } } },
        motives: strList, description: text, features,
    }, ['tier', 'role', 'difficulty', 'thresholds', 'hp', 'stress', 'attack', 'experiences', 'motives', 'description', 'features']),
    environment: record('environment', { tier, envType: { enum: ['event', 'exploration', 'social', 'traversal'] }, difficulty: { type: ['integer', 'string', 'null'] }, impulses: strList, description: text, adversariesText: str, adversaries: refList('adversary'), features }, ['tier', 'envType', 'impulses', 'description', 'adversaries', 'features']),
    beastform: record('beastform', {
        tier, examples: strList, evasionBonus: nint, advantages: strList, features,
        traitBonus: { type: ['object', 'null'], additionalProperties: false, properties: { trait, bonus: int } },
        attack: { type: ['object', 'null'], additionalProperties: false, properties: { range, trait, damage } },
    }, ['tier', 'examples', 'features']),
    domain: record('domain', { description: text, cards: { type: 'array', items: refList('domain-card') } }, ['description', 'cards']),
};

export const SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://duality-forge.pages.dev/data/schema/srd.schema.json',
    title: 'Duality Forge SRD data',
    description: `schemaVersion ${SCHEMA_VERSION}. One file per kind in data/srd/<dataVersion>/ — each an array of $defs[kind] records. See docs/srd-schema.md.`,
    $defs: KIND_SCHEMAS,
};
