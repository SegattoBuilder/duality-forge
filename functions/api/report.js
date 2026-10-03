// POST /api/report — bug reports, feature requests and auto-captured JS errors → KV (30-day TTL)
//
// Abuse limits (KV free tier = 1,000 writes/day):
//  - same-origin requests only, body ≤ 4 KB, known types only
//  - per-IP rate limit via the Cache API (free, no KV writes): 5/min and 30/day

const TYPES = new Set(['bug', 'feature', 'error']);
const MAX_BODY = 4096;
const LIMITS = [{ window: 60, max: 5 }, { window: 86400, max: 30 }];

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const int = (v) => (Number.isInteger(v) && v >= 0 && v < 1e7 ? v : null);

// Approximate per-IP counter in the edge cache (per data center — good enough to stop floods)
async function overLimit(request, ip) {
    const cache = caches.default;
    const host = new URL(request.url).host;
    for (const { window, max } of LIMITS) {
        const bucket = Math.floor(Date.now() / 1000 / window);
        const key = new Request(`https://${host}/__rl/report/${window}/${bucket}/${encodeURIComponent(ip)}`);
        const hit = await cache.match(key);
        const count = hit ? parseInt(await hit.text(), 10) || 0 : 0;
        if (count >= max) return true;
        await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${window}` } }));
    }
    return false;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false }, 403);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false }, 413);

    let data;
    try { data = JSON.parse(raw); } catch { return json({ ok: false }, 400); }
    const type = TYPES.has(data?.type) ? data.type : null;
    const message = clip(data?.message, 1000).trim();
    if (!type || !message) return json({ ok: false }, 400);

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (await overLimit(request, ip)) return json({ ok: false, error: 'rate_limited' }, 429);

    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const report = {
        id,
        type,
        timestamp: new Date().toISOString(),
        message,
        page: clip(data.page, 200),
        source: clip(data.source, 500),
        line: int(data.line),
        col: int(data.col),
        userAgent: clip(request.headers.get('user-agent'), 300),
    };
    await env.forge_reports.put(id, JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ ok: true });
}
