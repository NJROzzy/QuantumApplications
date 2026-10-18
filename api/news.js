import { readFile } from 'node:fs/promises';
import { collectNews, REFRESH_MS } from '../lib/news-service.js';

let cached = null, inFlight = null, expires = 0;
export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; res.end('Method not allowed'); return; }
  try {
    if (!cached || Date.now() >= expires) {
      if (!inFlight) inFlight = (async () => {
        let snapshot = { articles: [], checkedAt: null };
        try { snapshot = JSON.parse(await readFile(new URL('../public/content/news-snapshot.json', import.meta.url), 'utf8')); } catch { /* Live sources still work without a bundled snapshot. */ }
        cached = await collectNews({ snapshot, previous: cached }); expires = Date.now() + (cached.mode === 'snapshot' ? 60_000 : REFRESH_MS); return cached;
      })().finally(() => { inFlight = null; });
      await inFlight;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', cached.mode === 'snapshot' ? 'public, max-age=0, s-maxage=60' : 'public, max-age=0, s-maxage=900, stale-while-revalidate=300');
    res.statusCode = 200; res.end(req.method === 'HEAD' ? undefined : JSON.stringify(cached));
  } catch {
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Research feed temporarily unavailable. The saved edition remains available.' }));
  }
}
