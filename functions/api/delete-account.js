export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ ok: false, error: 'Unauthorized' }, 401);
        }
        const token = authHeader.slice(7);

        const supabaseUrl = env.SUPABASE_URL;
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) {
            return json({ ok: false, error: 'Server misconfigured' }, 500);
        }

        // Verify the user's token via Supabase REST API
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': env.SUPABASE_ANON_KEY }
        });
        if (!userRes.ok) return json({ ok: false, error: 'Invalid session' }, 401);
        const user = await userRes.json();
        const uid = user.id;

        const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
        const rest = `${supabaseUrl}/rest/v1`;

        // 1. Snapshot anonymized analytics
        const profileRes = await fetch(`${rest}/profiles?id=eq.${uid}&select=*`, { headers });
        const profiles = await profileRes.json();
        const profile = profiles?.[0] || null;

        const charRows = await (await fetch(`${rest}/characters?user_id=eq.${uid}&select=id`, { headers })).json();
        const charCount = Array.isArray(charRows) ? charRows.length : 0;
        const tableRows = await (await fetch(`${rest}/dm_tables?user_id=eq.${uid}&select=id`, { headers })).json();
        const tableCount = Array.isArray(tableRows) ? tableRows.length : 0;

        await fetch(`${rest}/user_analytics_snapshots`, {
            method: 'POST', headers,
            body: JSON.stringify({
                account_created_at: user.created_at,
                account_deleted_at: new Date().toISOString(),
                last_active_at: user.last_sign_in_at,
                country: profile?.country || null,
                state: profile?.state || null,
                age_bracket: profile?.age || null,
                auth_provider: user.app_metadata?.provider || null,
                total_characters: charCount || 0,
                total_campaigns: tableCount || 0,
                was_dm: tableCount > 0,
                was_player: charCount > 0,
                dm_experience: profile?.dm_experience || null,
                player_experience: profile?.player_experience || null
            })
        });

        // 2. Unlink party members from this user's DM tables
        const tablesRes = await fetch(`${rest}/dm_tables?user_id=eq.${uid}&select=id`, { headers });
        const tables = await tablesRes.json();
        if (tables?.length) {
            const tableIds = tables.map(t => t.id);
            await fetch(`${rest}/characters?table_id=in.(${tableIds.join(',')})`, {
                method: 'PATCH', headers,
                body: JSON.stringify({ table_id: null, table_approved: null })
            });
        }

        // 3. Anonymize community shared content (keep content, remove author link)
        await fetch(`${rest}/community_chapters?author_id=eq.${uid}`, {
            method: 'PATCH', headers,
            body: JSON.stringify({ author_id: null, author_nickname: 'Unknown' })
        });

        // 4. Delete all user data
        await fetch(`${rest}/community_ratings?user_id=eq.${uid}`, { method: 'DELETE', headers });
        await fetch(`${rest}/community_imports?user_id=eq.${uid}`, { method: 'DELETE', headers });
        await fetch(`${rest}/characters?user_id=eq.${uid}`, { method: 'DELETE', headers });
        await fetch(`${rest}/dm_tables?user_id=eq.${uid}`, { method: 'DELETE', headers });
        await fetch(`${rest}/profiles?id=eq.${uid}`, { method: 'DELETE', headers });

        // 5. Delete auth user
        const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${uid}`, {
            method: 'DELETE', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
        });
        if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}));
            return json({ ok: false, error: 'Failed to delete auth user: ' + (err.message || 'Unknown') }, 500);
        }

        return json({ ok: true });
    } catch (e) {
        return json({ ok: false, error: 'Internal error' }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
