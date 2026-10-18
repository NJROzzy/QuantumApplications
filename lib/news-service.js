import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { connectionsFor } from '../public/frontier-model.js';

export const SOURCES = [
  { id: 'arxiv', name: 'arXiv · quant-ph', homepage: 'https://arxiv.org/list/quant-ph/recent', urls: ['https://export.arxiv.org/api/query?search_query=cat%3Aquant-ph&start=0&max_results=12&sortBy=submittedDate&sortOrder=descending', 'https://rss.arxiv.org/rss/quant-ph'], hosts: ['arxiv.org', 'export.arxiv.org', 'rss.arxiv.org'], type: 'Preprint', format: 'xml' },
  { id: 'ibm', name: 'IBM Quantum', homepage: 'https://www.ibm.com/quantum/blog', urls: ['https://www.ibm.com/quantum/blog'], hosts: ['www.ibm.com', 'ibm.com'], type: 'Company research', format: 'ibm' },
  { id: 'google', name: 'Google Quantum AI', homepage: 'https://quantumai.google/', urls: ['https://blog.google/innovation-and-ai/models-and-research/quantum-computing/rss/'], hosts: ['blog.google', 'quantumai.google', 'research.google'], type: 'Company research', format: 'xml' },
  { id: 'mit', name: 'MIT News', homepage: 'https://news.mit.edu/topic/quantum-physics', urls: ['https://news.mit.edu/topic/mitquantum-mechanics-rss.xml'], hosts: ['news.mit.edu'], type: 'Research news', format: 'xml' },
  { id: 'nature', name: 'Nature · npj Quantum Information', homepage: 'https://www.nature.com/npjqi/', urls: ['https://www.nature.com/npjqi.rss', 'https://api.crossref.org/journals/2056-6387/works?sort=published&order=desc&rows=8'], hosts: ['www.nature.com', 'nature.com'], transportHosts: ['api.crossref.org'], type: 'Journal article', format: 'xml' },
];
export const REFRESH_MS = 15 * 60 * 1000;
const MAX_BODY = 2_000_000;
export function plainText(value = '') { const $ = load(String(value).slice(0, MAX_BODY)); $('script,style,iframe,object').remove(); return $.root().text().replace(/\s+/g, ' ').trim(); }
export function excerpt(value, limit = 250) { const text = plainText(value); if (text.length <= limit) return text; return text.slice(0, limit).replace(/\s+\S*$/, '') + '…'; }
export function validDate(value) { if (!value || !String(value).trim()) return null; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : null; }
export function sourceUrl(value, source) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, source.homepage);
    if (url.protocol === 'http:' && source.id === 'arxiv') url.protocol = 'https:';
    if (url.protocol !== 'https:' || url.username || url.password || !source.hosts.includes(url.hostname)) return null;
    url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^(utm_|gclid|fbclid)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
export function normalizeArticle(raw, source, retrievedAt) {
  const title = plainText(raw.title).slice(0, 350), url = sourceUrl(raw.url, source);
  if (!title || !url) return null;
  const summary = excerpt(raw.summary || 'Open the original source for the complete research report.');
  return { id: createHash('sha256').update(url).digest('hex').slice(0, 16), title, url, summary, publishedAt: validDate(raw.publishedAt), sourceId: source.id, sourceName: source.name, kind: source.type, summaryType: raw.summaryType || 'Source excerpt', retrievedAt, freshness: 'live', ...connectionsFor(`${title} ${summary} ${raw.tags || ''}`, source.id) };
}
export function parseXmlFeed(body, source, retrievedAt) {
  const $ = load(body, { xmlMode: true }), entries = $('item, entry');
  return entries.toArray().slice(0, 30).map(element => {
    const item = $(element), atomLink = item.children('link[rel="alternate"]').attr('href') || item.children('link[href]').attr('href');
    return normalizeArticle({ title: item.children('title').first().text(), url: atomLink || item.children('link').first().text() || item.children('guid').text(), summary: item.children('description').text() || item.children('summary').text() || item.children('content\\:encoded').text(), publishedAt: item.children('pubDate').text() || item.children('published').text() || item.children('dc\\:date').text(), tags: item.children('category').map((_, tag) => $(tag).attr('term') || $(tag).text()).get().join(' ') }, source, retrievedAt);
  }).filter(Boolean);
}
export function parseIbmIndex(body, source, retrievedAt) {
  const $ = load(body), articles = [];
  $('a[data-testid="blog-card"]').each((_, element) => {
    const card = $(element), title = card.find('h2,h3,h4,h5,h6').first().text(), text = card.find('footer p').first().text(), date = text.match(/\b\d{1,2} [A-Z][a-z]{2} \d{4}\b/)?.[0];
    const tags = card.find('[class*="tag__label"]').map((_, tag) => $(tag).text()).get().join(', ');
    const article = normalizeArticle({ title, url: card.attr('href'), summary: `IBM Quantum reports on ${tags || 'quantum computing research and tools'}. Read the original post for the full methods, updates, and limitations.`, publishedAt: date ? `${date} 00:00:00 GMT` : null, tags, summaryType: 'Topic overview' }, source, retrievedAt);
    if (article) articles.push(article);
  });
  return deduplicate(articles).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 6);
}
export function parseCrossref(body, source, retrievedAt) {
  const data = JSON.parse(body);
  return (data.message?.items || []).filter(item => item.DOI?.startsWith('10.1038/s41534-')).map(item => {
    const parts = (item['published-online'] || item.published || {})['date-parts']?.[0];
    const date = parts ? `${parts[0]}-${String(parts[1] || 1).padStart(2, '0')}-${String(parts[2] || 1).padStart(2, '0')}` : null;
    const article = normalizeArticle({ title: item.title?.[0], url: `https://www.nature.com/articles/${item.DOI.slice('10.1038/'.length)}`, summary: item.abstract || `Journal research in npj Quantum Information. Read the original paper for the methods, results, and limitations.`, publishedAt: date, summaryType: item.abstract ? 'Publisher abstract excerpt' : 'Journal metadata' }, source, retrievedAt);
    return article ? { ...article, transport: 'Crossref publisher metadata' } : null;
  }).filter(Boolean);
}
export function deduplicate(articles) { const seen = new Set(); return articles.filter(article => { if (seen.has(article.url)) return false; seen.add(article.url); return true; }); }

async function fetchBody(url, source, fetchImpl) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 6500);
  try {
    let current = url;
    for (let redirects = 0; redirects < 4; redirects++) {
      const response = await fetchImpl(current, { signal: controller.signal, redirect: 'manual', headers: { 'User-Agent': 'QuantumApplicationsbyNJR/1.0 (+https://quantumapplicationsbynjr.vercel.app)', Accept: 'application/atom+xml, application/rss+xml, application/xml, text/html;q=0.8' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) { current = sourceUrl(new URL(response.headers.get('location'), current).href, { ...source, hosts: [...source.hosts, ...(source.transportHosts || [])] }); if (!current) throw new Error('Unexpected redirect'); continue; }
      if (!response.ok) throw new Error(`Publisher returned HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > MAX_BODY) throw new Error('Publisher response too large');
      const reader = response.body?.getReader();
      if (!reader) { const body = await response.text(); if (body.length > MAX_BODY) throw new Error('Publisher response too large'); return body; }
      const chunks = []; let bytes = 0;
      while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > MAX_BODY) { await reader.cancel(); throw new Error('Publisher response too large'); } chunks.push(part.value); }
      return Buffer.concat(chunks).toString('utf8');
    }
    throw new Error('Too many redirects');
  } finally { clearTimeout(timer); }
}
async function fetchSource(source, fetchImpl, retrievedAt) {
  for (const url of source.urls) {
    try {
      const body = await fetchBody(url, source, fetchImpl);
      let articles = url.startsWith('https://api.crossref.org/') ? parseCrossref(body, source, retrievedAt) : source.format === 'ibm' ? parseIbmIndex(body, source, retrievedAt) : parseXmlFeed(body, source, retrievedAt);
      if (!articles.length) continue;
      if (source.format === 'ibm') articles = await Promise.all(articles.map(async article => {
        try { const $ = load(await fetchBody(article.url, source, fetchImpl)); const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'); if (description) return { ...article, summary: excerpt(description), summaryType: 'Source summary', ...connectionsFor(`${article.title} ${description}`, source.id) }; } catch { /* Topic overview remains usable and is labeled. */ }
        return article;
      }));
      return articles.slice(0, 12);
    } catch { /* Independent publishers may be unavailable; try a documented fallback. */ }
  }
  throw new Error('Publisher feed unavailable');
}

export async function collectNews({ fetchImpl = fetch, snapshot = { articles: [], checkedAt: null }, previous = null, now = new Date() } = {}) {
  const checkedAt = now.toISOString();
  const results = await Promise.allSettled(SOURCES.map(source => fetchSource(source, fetchImpl, checkedAt)));
  const articles = [], sources = [];
  results.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === 'fulfilled') { articles.push(...result.value); sources.push({ id: source.id, name: source.name, homepage: source.homepage, state: 'live', checkedAt, itemCount: result.value.length }); }
    else {
      const saved = (previous?.articles || []).filter(item => item.sourceId === source.id);
      const fallback = saved.length ? saved : (snapshot.articles || []).filter(item => item.sourceId === source.id);
      const usable = fallback.map(item => ({ ...item, freshness: 'saved' })); articles.push(...usable);
      const lastSuccess = previous?.sources?.find(item => item.id === source.id)?.lastSuccessAt || saved[0]?.retrievedAt || snapshot.checkedAt;
      sources.push({ id: source.id, name: source.name, homepage: source.homepage, state: usable.length ? 'saved' : 'unavailable', checkedAt, lastSuccessAt: lastSuccess || null, itemCount: usable.length });
    }
  });
  const liveCount = sources.filter(source => source.state === 'live').length;
  return { version: 1, checkedAt, snapshotAt: snapshot.checkedAt, mode: liveCount === SOURCES.length ? 'live' : liveCount ? 'partial' : 'snapshot', refreshAfterMs: REFRESH_MS, sources, articles: deduplicate(articles).filter(article => !article.publishedAt || Date.parse(article.publishedAt) <= now.getTime() + 24 * 60 * 60 * 1000).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 80) };
}
