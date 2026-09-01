export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const data = await request.json();
        const type = data.type || 'error';
        const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const report = {
            id,
            type,
            timestamp: new Date().toISOString(),
            message: (data.message || '').slice(0, 1000),
            page: data.page || '',
            source: (data.source || '').slice(0, 500),
            line: data.line || null,
            col: data.col || null,
            userAgent: request.headers.get('user-agent'),
        };
        await env.forge_reports.put(id, JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 30 });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
}
