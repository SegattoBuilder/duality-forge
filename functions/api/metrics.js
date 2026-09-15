export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    if ((url.searchParams.get('key') || '').trim() !== (env.FORGE_ADMIN_KEY || '').trim()) {
        return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        return json({ error: 'Server misconfigured' }, 500);
    }

    const headers = {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
    };
    const rest = `${supabaseUrl}/rest/v1`;

    try {
        const [usersRes, profilesRes, charsRes, tablesRes] = await Promise.all([
            fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
                headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
            }),
            fetch(`${rest}/profiles?select=id,nickname`, { headers }),
            fetch(`${rest}/characters?select=id,user_id,character_name,is_autosave`, { headers }),
            fetch(`${rest}/dm_tables?select=id,user_id,campaign_name,is_autosave`, { headers })
        ]);

        const usersBody = await usersRes.json();
        const users = usersBody.users || usersBody || [];
        const profiles = await profilesRes.json();
        const characters = await charsRes.json();
        const tables = await tablesRes.json();

        const profileMap = {};
        for (const p of profiles) profileMap[p.id] = p.nickname || null;

        const perUser = {};
        for (const u of users) {
            perUser[u.id] = {
                email: u.email,
                provider: u.app_metadata?.provider || 'email',
                created_at: u.created_at,
                last_sign_in: u.last_sign_in_at,
                nickname: profileMap[u.id] || null,
                has_profile: u.id in profileMap,
                characters: [],
                tables: []
            };
        }

        for (const c of characters) {
            if (perUser[c.user_id]) {
                perUser[c.user_id].characters.push({
                    id: c.id, name: c.character_name || 'Unnamed', is_autosave: c.is_autosave
                });
            }
        }
        for (const t of tables) {
            if (perUser[t.user_id]) {
                perUser[t.user_id].tables.push({
                    id: t.id, name: t.campaign_name || 'Unnamed', is_autosave: t.is_autosave
                });
            }
        }

        return json({
            totals: {
                accounts: users.length,
                profiles: profiles.length,
                characters: characters.length,
                dm_tables: tables.length
            },
            users: Object.entries(perUser).map(([id, data]) => ({ id, ...data }))
        });
    } catch (e) {
        return json({ error: 'Internal error' }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
