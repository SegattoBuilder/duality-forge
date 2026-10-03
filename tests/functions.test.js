import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost } from '../functions/api/report.js';
import { onRequestGet } from '../functions/api/reports.js';

function fakeKV() {
    const store = new Map();
    return {
        store,
        put: async (k, v) => { store.set(k, v); },
        get: async (k, opts) => (opts?.type === 'json' ? JSON.parse(store.get(k)) : store.get(k)),
        list: async () => ({ keys: [...store.keys()].map(name => ({ name })), list_complete: true }),
    };
}

function fakeCache() {
    const m = new Map();
    globalThis.caches = { default: {
        match: async (req) => (m.has(req.url) ? new Response(m.get(req.url)) : undefined),
        put: async (req, res) => { m.set(req.url, await res.text()); },
    } };
}

const post = (body, headers = {}) => new Request('https://df.pages.dev/api/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
});

describe('POST /api/report', () => {
    let env;
    beforeEach(() => { env = { forge_reports: fakeKV() }; fakeCache(); });

    it('stores a valid report', async () => {
        const res = await onRequestPost({ request: post({ type: 'bug', message: 'broken', page: '/dm/' }), env });
        expect(res.status).toBe(200);
        const saved = JSON.parse([...env.forge_reports.store.values()][0]);
        expect(saved).toMatchObject({ type: 'bug', message: 'broken', page: '/dm/' });
    });

    it('rejects unknown types (no arbitrary KV keys)', async () => {
        const res = await onRequestPost({ request: post({ type: 'x'.repeat(600), message: 'hi' }), env });
        expect(res.status).toBe(400);
        expect(env.forge_reports.store.size).toBe(0);
    });

    it('rejects oversized bodies', async () => {
        const res = await onRequestPost({ request: post({ type: 'bug', message: 'a'.repeat(5000) }), env });
        expect(res.status).toBe(413);
    });

    it('rejects cross-origin posts', async () => {
        const res = await onRequestPost({ request: post({ type: 'bug', message: 'hi' }, { origin: 'https://evil.example' }), env });
        expect(res.status).toBe(403);
    });

    it('rejects invalid JSON and empty messages', async () => {
        expect((await onRequestPost({ request: post('{nope'), env })).status).toBe(400);
        expect((await onRequestPost({ request: post({ type: 'bug', message: '   ' }), env })).status).toBe(400);
    });

    it('rate limits per IP: 5 per minute', async () => {
        const codes = [];
        for (let i = 0; i < 7; i++) codes.push((await onRequestPost({ request: post({ type: 'error', message: 'e' + i }), env })).status);
        expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429]);
        expect(env.forge_reports.store.size).toBe(5);
    });

    it('sanitizes numeric fields', async () => {
        await onRequestPost({ request: post({ type: 'error', message: 'e', line: 'x', col: 12 }), env });
        const saved = JSON.parse([...env.forge_reports.store.values()][0]);
        expect(saved.line).toBe(null);
        expect(saved.col).toBe(12);
    });
});

describe('GET /api/reports', () => {
    const get = (qs = '', headers = {}) => new Request('https://df.pages.dev/api/reports' + qs, { headers });

    it('requires the admin key', async () => {
        const env = { ADMIN_KEY: 'secret', forge_reports: fakeKV() };
        expect((await onRequestGet({ request: get(), env })).status).toBe(401);
        expect((await onRequestGet({ request: get('?key=wrong'), env })).status).toBe(401);
    });

    it('denies everything when ADMIN_KEY is not configured', async () => {
        const env = { forge_reports: fakeKV() };
        expect((await onRequestGet({ request: get('?key='), env })).status).toBe(401);
    });

    it('accepts header or query key; newest first', async () => {
        const kv = fakeKV();
        kv.store.set('bug_1000_a', JSON.stringify({ id: 'old' }));
        kv.store.set('bug_2000_b', JSON.stringify({ id: 'new' }));
        const env = { ADMIN_KEY: 'secret', forge_reports: kv };
        const res = await onRequestGet({ request: get('', { 'x-admin-key': 'secret' }), env });
        const body = await res.json();
        expect(body.reports.map(r => r.id)).toEqual(['new', 'old']);
        expect((await onRequestGet({ request: get('?key=secret'), env })).status).toBe(200);
    });
});
