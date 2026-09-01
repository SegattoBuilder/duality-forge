export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const secret = url.searchParams.get('key');
    if (secret !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
    }
    const list = await env.forge_reports.list({ limit: 100 });
    const reports = await Promise.all(list.keys.map(k => env.forge_reports.get(k.name, { type: 'json' })));
    reports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return new Response(JSON.stringify(reports, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
