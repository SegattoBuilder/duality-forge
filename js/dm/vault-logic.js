export function resetCreatureStats(creature) {
    return { hpFilled: creature.hpMax, stressFilled: creature.stressMax, hopeFilled: creature.hopeMax, armorFilled: creature.armorMax };
}

export function migrateGroupEntry(g) {
    return typeof g === 'string' ? { name: g, disposable: false } : g;
}

export function validateShareAdvFields(title, desc, consent) {
    return !!(title && desc && desc.split(/\s+/).length >= 3 && consent);
}

export function getGroupMembers(creatures, groups, group) {
    const groupNames = groups.map(g => g.name);
    if (group === '__ungrouped') return creatures.filter(c => !c.vaultGroup || !groupNames.includes(c.vaultGroup));
    return creatures.filter(c => c.vaultGroup === group);
}

export function buildShareAdversaryRow(user, profile, creature, ed, title, description) {
    return {
        author_id: user.id,
        author_nickname: profile.nickname,
        title,
        description,
        adversary_data: {
            name: creature.name,
            hp: ed.hp || String(creature.hpMax || 0),
            stress: ed.stress || String(creature.stressMax || 0),
            difficulty: ed.difficulty || String(creature.evasion || 0),
            thresholds: ed.thresholds || '',
            type: ed.type || '',
            tier: ed.tier || '',
            attack: ed.attack || '',
            damage: ed.damage || '',
            range: ed.range || '',
            atk: ed.atk || '',
            attacks: ed.attacks || [],
            experience: ed.experience || '',
            motives_and_tactics: ed.motives_and_tactics || '',
            ability: ed.ability || '',
            description: ed.description || '',
            feature: ed.feature || []
        },
        adv_type: ed.type || '',
        tier: ed.tier || '',
        difficulty: ed.difficulty || String(creature.evasion || 0)
    };
}
