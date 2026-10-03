// GET /api/reports — admin view of feedback reports
//
// Auth: `x-admin-key` header (preferred), or `?key=` for browser use.
// ⚠️ Query strings end up in browser history and logs — for stronger protection put
//    /api/reports behind Cloudflare Access (Zero Trust → Access → Applications).

function safeEqual(a, b) {
    const enc = new TextEncoder();
    const x = enc.encode(a || ''), y = enc.encode(b || '');
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
    return diff === 0;
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
    if (!env.ADMIN_KEY || !safeEqual(key, env.ADMIN_KEY)) {
        return new Response('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    // Collect all keys (KV lists in pages of up to 1,000)
    const keys = [];
    let cursor;
    do {
        const page = await env.forge_reports.list({ cursor, limit: 1000 });
        keys.push(...page.keys);
        cursor = page.list_complete ? null : page.cursor;
    } while (cursor && keys.length < 5000);

    const type = url.searchParams.get('type');
    const wanted = keys.filter(k => !type || k.name.startsWith(type + '_'));
    // Keys are `${type}_${timestamp}_…` — newest first, then fetch at most 200
    wanted.sort((a, b) => (b.name.split('_')[1] || '').localeCompare(a.name.split('_')[1] || ''));
    const reports = (await Promise.all(wanted.slice(0, 200).map(k => env.forge_reports.get(k.name, { type: 'json' })))).filter(Boolean);

    return new Response(JSON.stringify({ total: wanted.length, shown: reports.length, reports }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
}
