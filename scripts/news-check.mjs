import assert from 'node:assert/strict';
import { SOURCES, parseXmlFeed, parseIbmIndex, parseCrossref, plainText, excerpt, validDate, sourceUrl, deduplicate, collectNews } from '../lib/news-service.js';
import { connectionsFor, safeExternalUrl } from '../public/frontier-model.js';
import handler from '../api/news.js';

const now = new Date('2026-10-18T12:00:00Z'), at = now.toISOString();
const source = id => SOURCES.find(item => item.id === id);
const rss = (url, title = 'Quantum processor research', summary = 'A source summary about quantum hardware.') => `<rss><channel><item><title>${title}</title><link>${url}</link><description><![CDATA[<p>${summary}</p>]]></description><pubDate>Thu, 15 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Circuits and quantum AI</title><link rel="related" href="https://arxiv.org/pdf/2610.11111"/><link rel="alternate" href="http://arxiv.org/abs/2610.11111v1"/><summary>Neural networks improve quantum circuit search.</summary><published>2026-10-14T17:00:00Z</published><updated>2026-10-16T17:00:00Z</updated></entry></feed>';
const ibm = '<a data-testid="blog-card" href="/quantum/blog/test-control"><h5>IBM calibration with a neural decoder</h5><footer><p>15 Oct 2026 • Research team</p><span class="cds--tag__label">Hardware</span></footer></a>';
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }

await check('Atom uses the HTML source link and original publication date', () => {
  const [article] = parseXmlFeed(atom, source('arxiv'), at);
  assert.equal(article.url, 'https://arxiv.org/abs/2610.11111v1');
  assert.equal(article.publishedAt, '2026-10-14T17:00:00.000Z');
  assert.equal(article.kind, 'Preprint'); assert.ok(article.categories.includes('ai'));
});
await check('RSS and RDF preserve dates, decode entities, and strip publisher HTML', () => {
  const [article] = parseXmlFeed(rss('https://news.mit.edu/research', 'Quantum &amp; materials', 'An <strong>interference</strong> study.'), source('mit'), at);
  assert.equal(article.title, 'Quantum & materials'); assert.equal(article.summary, 'An interference study.');
  const rdf = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><title>Josephson junctions</title><link>https://www.nature.com/articles/s41534-026-test</link><dc:date>2026-10-14</dc:date><content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/"><![CDATA[<p>Quantum hardware research.</p>]]></content:encoded></item></rdf:RDF>';
  const [paper] = parseXmlFeed(rdf, source('nature'), at);
  assert.equal(paper.publishedAt, '2026-10-14T00:00:00.000Z'); assert.equal(paper.summary, 'Quantum hardware research.');
});
await check('External URLs, scripts, and missing dates are handled safely', () => {
  assert.equal(sourceUrl('javascript:alert(1)', source('ibm')), null);
  assert.equal(sourceUrl('https://www.ibm.com.attacker.invalid/a', source('ibm')), null);
  assert.equal(sourceUrl('', source('ibm')), null);
  assert.equal(safeExternalUrl('https://name:password@example.com'), null);
  assert.equal(safeExternalUrl('data:text/html,test'), null);
  assert.equal(validDate(null), null); assert.equal(validDate('invalid'), null);
  assert.equal(plainText('<script>steal()</script><p>Research &amp; results</p>'), 'Research & results');
  assert.ok(excerpt('A scientific finding. '.repeat(50)).length <= 251);
  assert.equal(parseXmlFeed(rss('https://attacker.invalid/story'), source('mit'), at).length, 0);
});
await check('IBM cards preserve source dates, topic labels, and canonical URLs', () => {
  const [article] = parseIbmIndex(ibm, source('ibm'), at);
  assert.equal(article.publishedAt, '2026-10-15T00:00:00.000Z');
  assert.equal(article.url, 'https://www.ibm.com/quantum/blog/test-control');
  assert.equal(article.summaryType, 'Topic overview'); assert.ok(article.companies.includes('ibm'));
});
await check('Nature metadata fallback requires its journal DOI and avoids invented day precision', () => {
  const data = { message: { items: [ { DOI: '10.1038/s41534-026-test', title: ['Quantum sensing'], 'published-online': { 'date-parts': [[2026, 10, 14]] }, abstract: '<jats:p>Interference measurements.</jats:p>' }, { DOI: '10.5555/not-nature', title: ['Other journal'] }, { DOI: '10.1038/s41534-026-partial', title: ['Partial date'], published: { 'date-parts': [[2026]] } } ] } };
  const papers = parseCrossref(JSON.stringify(data), source('nature'), at);
  assert.equal(papers.length, 2); assert.equal(papers[0].publishedAt, '2026-10-14T00:00:00.000Z');
  assert.equal(papers[1].publishedAt, null); assert.equal(papers[0].transport, 'Crossref publisher metadata');
});
await check('Connections classify the research itself and map relevant concepts', () => {
  const ai = connectionsFor('Large language models design quantum computing circuits', 'arxiv'); assert.ok(ai.categories.includes('ai')); assert.ok(ai.categories.includes('computing')); assert.ok(ai.applications.includes(11));
  assert.ok(!connectionsFor('Logical quantum error correction', 'google').categories.includes('ai'));
  assert.ok(!connectionsFor('Google Quantum AI reports logical quantum error correction', 'google').categories.includes('ai'));
  assert.equal(connectionsFor('IonQ photonic interconnect and entanglement').lab, 'bell');
  assert.equal(connectionsFor('Quantum tunneling through barriers').lab, 'tunnel');
  assert.equal(connectionsFor('Optical interference and sensing').lab, 'slit');
  assert.equal(deduplicate([{url:'https://example.org/a'},{url:'https://example.org/a'}]).length, 1);
});

const healthyFetch = async url => {
  if (url.includes('export.arxiv.org')) return new Response(atom);
  if (url === 'https://www.ibm.com/quantum/blog') return new Response(ibm);
  if (url.includes('www.ibm.com')) return new Response('<meta name="description" content="New controls for quantum calibration and error correction.">');
  if (url.includes('blog.google')) return new Response(rss('https://blog.google/quantum/research', 'Google Willow processor', 'Quantum error correction with a superconducting processor.'));
  if (url.includes('news.mit.edu')) return new Response(rss('https://news.mit.edu/quantum-research', 'Quantum interference in materials'));
  return new Response(rss('https://www.nature.com/articles/s41534-026-test', 'Quantum materials research'));
};
await check('All source adapters combine into one normalized, date-sorted feed', async () => {
  const data = await collectNews({fetchImpl: healthyFetch, now});
  assert.equal(data.mode, 'live'); assert.equal(data.sources.length, 5); assert.equal(data.articles.length, 5);
  assert.ok(data.articles.every(article => article.freshness === 'live' && article.retrievedAt === at));
  assert.equal(data.articles.find(article => article.sourceId === 'ibm').summaryType, 'Source summary');
});
await check('A publisher outage preserves saved dates without claiming live retrieval', async () => {
  const saved = parseXmlFeed(rss('https://www.nature.com/articles/s41534-026-old'), source('nature'), '2026-10-10T10:00:00Z')[0];
  const data = await collectNews({ now, snapshot: {checkedAt:'2026-10-10T10:00:00Z',articles:[saved]}, fetchImpl: url => /nature.com|api.crossref.org/.test(url) ? Promise.resolve(new Response('',{status:503})) : healthyFetch(url) });
  assert.equal(data.mode, 'partial'); assert.equal(data.sources.find(item => item.id === 'nature').state, 'saved');
  const article = data.articles.find(item => item.sourceId === 'nature'); assert.equal(article.freshness, 'saved'); assert.equal(article.retrievedAt, '2026-10-10T10:00:00Z'); assert.equal(article.publishedAt, saved.publishedAt);
});
await check('Unexpected redirects are rejected and future publications are excluded', async () => {
  const requested = [];
  const data = await collectNews({now,fetchImpl:async url=>{requested.push(url);return url.includes('news.mit.edu') ? new Response('',{status:302,headers:{location:'http://127.0.0.1/private'}}) : healthyFetch(url);}});
  assert.equal(data.sources.find(item=>item.id==='mit').state,'unavailable'); assert.ok(requested.every(url=>!url.includes('127.0.0.1')));
  const future = await collectNews({now,fetchImpl:async url=>url.includes('news.mit.edu') ? new Response(rss('https://news.mit.edu/future').replace('Thu, 15 Oct 2026 12:00:00 GMT','Sun, 15 Nov 2026 12:00:00 GMT')) : healthyFetch(url)});
  assert.ok(future.articles.every(article=>!article.url.includes('/future')));
});
await check('API caches outages briefly, supports HEAD, and rejects mutation methods', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async()=>{calls++;return new Response('',{status:503});};
  const response = () => ({ headers:{},setHeader(key,value){this.headers[key]=value;},end(body){this.body=body;} });
  try {
    const first=response();await handler({method:'GET'},first);assert.equal(first.statusCode,200);
    const body=JSON.parse(first.body);assert.equal(body.mode,'snapshot');assert.ok(body.articles.length>0);assert.ok(body.articles.every(article=>article.freshness==='saved'));assert.match(first.headers['Cache-Control'],/s-maxage=60/);
    const count=calls;const second=response();await handler({method:'GET'},second);assert.equal(calls,count);
    const head=response();await handler({method:'HEAD'},head);assert.equal(head.body,undefined);assert.equal(head.statusCode,200);
    const post=response();await handler({method:'POST'},post);assert.equal(post.statusCode,405);assert.equal(calls,count);
  } finally {globalThis.fetch=original;}
});
console.log(`\n${passed} news-service checks passed.`);
