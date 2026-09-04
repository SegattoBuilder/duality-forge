export async function onRequestGet({ env }) {
    return new Response(JSON.stringify({
        SUPABASE_URL: env.SUPABASE_URL ? `✅ set (${env.SUPABASE_URL.slice(0, 12)}...)` : '❌ missing',
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? `✅ set (${env.SUPABASE_ANON_KEY.slice(0, 12)}...)` : '❌ missing',
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? `✅ set (${env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 12)}...)` : '❌ missing',
    }), { headers: { 'Content-Type': 'application/json' } });
}
