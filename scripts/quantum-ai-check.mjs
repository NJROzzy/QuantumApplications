import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { AI_PILLARS, aiPillarsFor, selectAiNews } from '../public/quantum-ai-model.js';
import { initQuantumAI } from '../public/quantum-ai.js';
import { initFrontier } from '../public/frontier.js';
import { buildUniverse } from '../public/universe-model.js';
import { LAB_NAMES } from '../public/frontier-model.js';

const html = await readFile('public/index.html', 'utf8');
const content = JSON.parse(await readFile('public/content/quantum-ai.json', 'utf8'));
const snapshot = JSON.parse(await readFile('public/content/news-snapshot.json', 'utf8'));
const catalogs = Object.fromEntries(await Promise.all(['toolkit','industry','innovators','evolution'].map(async name => [name,JSON.parse(await readFile(`public/content/${name}.json`, 'utf8'))])));
const titles = [
  'Quantum processor control with superconducting qubits',
  'Qiskit quantum circuit compilation methods',
  'Quantum kernel methods for machine learning',
  'Neural-network decoders for quantum error correction',
  'Quantum photonic generative models',
  'Fault-tolerant quantum resource estimation',
  'Cirq quantum software for simulation',
  'Barren plateaus in quantum neural network training',
  'Google Quantum AI welcomes a new fellowship cohort',
  'The latest artificial intelligence product news',
];
const feed = { ...snapshot, mode: 'live', sources: snapshot.sources.map(source => ({ ...source, state: 'live' })), articles: titles.map((title,index) => ({ ...snapshot.articles[0], id: `fixture-${index}`, title, summary: 'A source excerpt for this research fixture.', url: `https://arxiv.org/abs/test-fixture-${index}`, sourceId: index === 1 ? 'ibm' : 'arxiv', sourceName: index === 1 ? 'IBM Quantum' : 'arXiv · quant-ph', kind: index === 1 ? 'Company research' : 'Preprint', publishedAt: `2026-10-${String(30-index).padStart(2,'0')}T00:00:00Z`, freshness: 'live', categories: ['research','ai'], lab: 'qubit' })) };
const clone = value => structuredClone(value), flush = () => new Promise(resolve => setTimeout(resolve,0));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
function setup({ failApi = false, failPillars = false, failSnapshot = false, catalog = content, edition = feed } = {}) {
  const errors = [], virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: 'https://quantum.test/', pretendToBeVisual: true, virtualConsole });
  const { window } = dom, { document } = window;
  window.matchMedia = () => ({ matches: true }); window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  let tick, delay, calls = 0, hidden = false, current = edition, failed = failApi;
  window.setInterval = (fn, milliseconds) => { tick = fn; delay = milliseconds; return 1; }; window.clearInterval = () => {};
  Object.defineProperty(document, 'hidden', { get: () => hidden });
  window.fetch = async url => {
    if (url === '/api/news') { calls++; if (failed) throw new Error('offline'); return { ok: true, json: async () => clone(current) }; }
    if ((url === '/content/quantum-ai.json' && failPillars) || (url === '/content/news-snapshot.json' && failSnapshot)) throw new Error('offline');
    return { ok: true, json: async () => clone(url === '/content/quantum-ai.json' ? catalog : url === '/content/industry.json' ? catalogs.industry : feed) };
  };
  const frontier = initFrontier({ document, window }), ai = initQuantumAI({ document, window, frontier });
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const click = selector => { const element = $(selector); assert.ok(element, selector); element.click(); };
  const change = (selector,value,type = 'input') => { $(selector).value = value; $(selector).dispatchEvent(new window.Event(type)); };
  const keys = (selector,key) => { $(selector).focus(); $(selector).dispatchEvent(new window.KeyboardEvent('keydown', { key,bubbles:true,cancelable:true })); };
  return { $, $$, document, window, click, change, keys, errors, frontier, ai, ready: Promise.all([frontier.ready,ai.ready]), get calls() { return calls; }, get delay() { return delay; }, tick: () => tick(), hide: value => { hidden = value; }, fail: value => { failed = value; }, edition: value => { current = value; }, cleanup() { ai.destroy(); frontier.destroy(); dom.window.close(); } };
}

await check('The four pillars have primary sources and valid toolkit, guide, lab, and universe connections', () => {
  assert.deepEqual(content.pillars.map(item => item.id), AI_PILLARS.map(item => item.id));
  const universe = buildUniverse(catalogs);
  for (const pillar of content.pillars) {
    assert.equal(pillar.workflow.length,4); assert.equal(pillar.topics.length,3); assert.ok(pillar.resources.length >= 4);
    assert.ok(pillar.question && pillar.prerequisites.length >= 4 && pillar.model.expression && pillar.model.assumptions);
    assert.equal(pillar.evaluation.length,4); assert.equal(pillar.project.steps.length,4); assert.equal(pillar.project.deliverables.length,3);
    for(const topic of pillar.topics) { assert.ok(topic.detail); assert.ok(topic.sources.every(index => pillar.resources[index])); }
    assert.ok(pillar.resources[pillar.model.source]);
    assert.ok(pillar.chapter >= 1 && pillar.chapter <= 19 && LAB_NAMES[pillar.starter.lab]); assert.ok(universe.byId.has(pillar.universe));
    assert.ok(catalogs.toolkit.techniques.some(item => item.id === pillar.technique));
    for (const id of pillar.tools) assert.ok(catalogs.toolkit.tools.some(item => item.id === id));
    for (const resource of pillar.resources) assert.equal(new URL(resource.url).protocol,'https:');
  }
  assert.match(content.pillars[2].perspective,/advantage.*not established/);
  assert.match(content.pillars[3].summary,/two distinct directions/);
});
await check('Relevance matching distinguishes the four pillars and AI for quantum from quantum ML', () => {
  assert.ok(aiPillarsFor(feed.articles[0]).includes('tech')); assert.ok(aiPillarsFor(feed.articles[1]).includes('programming'));
  assert.ok(aiPillarsFor(feed.articles[2]).includes('ml')); assert.ok(aiPillarsFor(feed.articles[4]).includes('ml'));
  assert.ok(aiPillarsFor(feed.articles[3]).includes('advanced')); assert.ok(!aiPillarsFor(feed.articles[3]).includes('ml'));
  assert.ok(aiPillarsFor({title:'Large language models design quantum circuits'}).includes('advanced'));
  assert.deepEqual(aiPillarsFor(feed.articles[8]),[]); assert.deepEqual(aiPillarsFor(feed.articles[9]),[]);
});
await check('News selection deduplicates safe URLs, sorts by publication, and combines pillar/source/search filters', () => {
  assert.equal(selectAiNews(feed).length,8);
  const corrupted = clone(feed); corrupted.articles.push(feed.articles[0],{...feed.articles[0],url:'javascript:alert(1)'},{...feed.articles[0],url:'https://example.org/a',sourceId:'unknown'});
  assert.equal(selectAiNews(corrupted).length,8);
  assert.equal(selectAiNews(feed,{pillar:'programming',source:'ibm',query:'compilation'}).length,1);
  assert.equal(selectAiNews(feed,{pillar:'ml',source:'ibm'}).length,0);
  assert.deepEqual(selectAiNews(feed).map(item=>item.publishedAt),selectAiNews(feed).map(item=>item.publishedAt).sort().reverse());
});

const app = setup(); await app.ready;
const { $, $$, click, change, keys } = app;
await check('Quantum AI appears in navigation and all four pillar panels expose their complete learning content', () => {
  assert.ok($('#main-nav a[href="#quantum-ai"]'));
  for (const pillar of content.pillars) {
    click(`[data-ai-pillar="${pillar.id}"]`);
    assert.equal($('#ai-pillar-panel h3').textContent,pillar.headline);
    assert.equal($('#ai-pillar-panel').getAttribute('aria-labelledby'),`ai-pillar-${pillar.id}`);
    assert.equal($$('#ai-pillar-tabs [aria-selected="true"]').length,1); assert.equal($$('#ai-pillar-tabs [tabindex="0"]').length,1);
    assert.equal($$('.ai-topic-grid article').length,3); assert.equal($$('.ai-resources a').length,pillar.resources.length);
    assert.equal($('#ai-pillar-panel [data-launch-sim]').dataset.launchSim,pillar.starter.lab);
    assert.equal($('#ai-news-pillars [aria-pressed="true"]').dataset.aiNewsPillar,pillar.id);
  }
  assert.match($('#ai-content-reviewed').textContent,/Nov 5, 2026/); assert.equal($('#ai-pillar-panel').getAttribute('aria-busy'),'false');
});
await check('Pillar tabs and their four-step workflows support arrows, Home/End, and correct focus', () => {
  keys('#ai-pillar-advanced','ArrowRight'); assert.equal(app.document.activeElement,$('#ai-pillar-tech'));
  keys('#ai-pillar-tech','End'); assert.equal(app.document.activeElement,$('#ai-pillar-advanced'));
  keys('#ai-pillar-advanced','Home'); assert.equal(app.document.activeElement,$('#ai-pillar-tech'));
  for (let index=0;index<4;index++) { click(`[data-ai-step="${index}"]`); assert.equal($('#ai-workflow-detail h4').textContent,content.pillars[0].workflow[index].title); assert.equal($('#ai-workflow-detail').getAttribute('aria-labelledby'),`ai-workflow-step-${index}`); }
  keys('#ai-workflow-step-3','ArrowRight'); assert.equal(app.document.activeElement,$('#ai-workflow-step-0')); assert.equal($$('#ai-workflow-steps [aria-selected="true"]').length,1);
});
await check('All pillar resource links retain safe official source attributes', () => {
  for (const pillar of content.pillars) { click(`[data-ai-pillar="${pillar.id}"]`); for (const link of $$('.ai-resources a')) { assert.equal(new URL(link.href).protocol,'https:'); assert.equal(link.target,'_blank'); assert.match(link.rel,/noopener/); } }
});
await check('Research shows original dates, publication types, topic labels, and stable pagination', () => {
  click('[data-ai-news-reset]'); assert.equal($$('.ai-news-card').length,3); assert.match($('#ai-news-count').textContent,/3 of 8/);
  const first = $$('.ai-news-card h4').map(element=>element.textContent); click('#ai-news-more'); assert.equal($$('.ai-news-card').length,6); assert.deepEqual($$('.ai-news-card h4').slice(0,3).map(element=>element.textContent),first);
  assert.equal(app.document.activeElement,$$('.ai-news-card h4 a')[3]);
  click('#ai-news-more'); assert.equal($$('.ai-news-card').length,8); assert.ok($('#ai-news-more').hidden);
  for (const card of $$('.ai-news-card')) { assert.ok(card.querySelector('time[datetime]')); assert.ok(card.querySelector('.ai-news-tags')); assert.ok(card.querySelector('.ai-news-topics span')); assert.match(card.textContent,/Source excerpt/); }
});
await check('Research filters combine, empty states reset, and pillar selection keeps the wider view available', () => {
  click('[data-ai-news-pillar="programming"]'); change('#ai-news-source','ibm','change'); change('#ai-news-search','compilation'); assert.equal($$('.ai-news-card').length,1);
  change('#ai-news-search','no-such-quantum-signal'); assert.match($('#quantum-ai-news-grid').textContent,/No matching developments/);
  click('#quantum-ai-news-grid [data-ai-news-reset]'); assert.equal($('#ai-news-search').value,''); assert.equal($('#ai-news-source').value,'all'); assert.equal(app.document.activeElement,$('#ai-news-search'));
  click('[data-ai-pillar="ml"]'); assert.ok($$('.ai-news-topics').every(element=>element.textContent.includes('Quantum Machine Learning')));
  click('[data-ai-news-pillar="all"]'); assert.equal($('#ai-pillar-ml').getAttribute('aria-selected'),'true'); assert.match($('#ai-news-count').textContent,/all four pillars/);
});
await check('Both news panels share one request, one timer, and manual refresh updates both together', async () => {
  assert.equal(app.calls,1); assert.equal(app.delay,900000);
  const updated = clone(feed); updated.articles[0].title = 'Quantum processor control: a newer research fixture'; app.edition(updated);
  click('#ai-news-refresh'); assert.ok($('#ai-news-refresh').disabled && $('#refresh-news').disabled); await flush();
  assert.equal(app.calls,2); assert.match($('#quantum-ai-news-grid').textContent,/newer research fixture/); assert.match($('#news-grid').textContent,/newer research fixture/);
  assert.equal($('#ai-news-updated').title,updated.checkedAt); assert.match($('#ai-news-updated').textContent,/UTC/);
});
await check('Automatic research updates pause when hidden, a dialog is open, or a new research link is focused', async () => {
  const before = app.calls; app.hide(true); app.tick(); assert.equal(app.calls,before); app.hide(false);
  $('#application-dialog').open = true; app.tick(); assert.equal(app.calls,before); $('#application-dialog').open = false;
  $('.ai-news-card h4 a').focus(); app.tick(); assert.equal(app.calls,before);
  $('#ai-news-refresh').focus(); app.tick(); await flush(); assert.equal(app.calls,before+1);
});
await check('Failures mark retained articles as saved without replacing their original publication dates', async () => {
  const original = $('.ai-news-card time').getAttribute('datetime'); app.fail(true); await app.frontier.refreshNews();
  assert.match($('#ai-news-health').textContent,/SAVED EDITION/); assert.match($('#ai-news-freshness').textContent,/saved edition/);
  assert.equal($('.ai-news-card time').getAttribute('datetime'),original); assert.equal($$('.ai-news-card .saved-tag').length,3);
  app.fail(false); await app.frontier.refreshNews(); assert.equal($$('.ai-news-card .saved-tag').length,0);
});
assert.deepEqual(app.errors,[]); app.cleanup();

await check('Partial publisher outages remain visible and individual saved items stay labeled', async () => {
  const partial = clone(feed); partial.sources[0].state = 'saved'; partial.articles.filter(item=>item.sourceId==='arxiv').forEach(item=>{item.freshness='saved';});
  const other = setup({edition:partial}); await other.ready; assert.match(other.$('#ai-news-health').textContent,/4 \/ 5/); assert.ok(other.$$('.ai-news-card .saved-tag').length); assert.match(other.$('#ai-news-freshness').textContent,/Some sources/); other.cleanup();
});
await check('A learning-catalog outage leaves research usable, while complete feed outages show a retry state', async () => {
  const failed = setup({failPillars:true}); await failed.ready; assert.match(failed.$('#ai-pillar-panel').textContent,/could not load/); assert.equal(failed.$$('.ai-news-card').length,3); failed.cleanup();
  const offline = setup({failApi:true,failSnapshot:true}); await offline.ready; assert.match(offline.$('#ai-news-health').textContent,/UNAVAILABLE/); assert.match(offline.$('#quantum-ai-news-grid').textContent,/temporarily unavailable/); assert.equal(offline.$('#ai-news-refresh').disabled,false); assert.ok(offline.$('#ai-pillar-panel h3')); offline.cleanup();
});
await check('Unsafe links are suppressed and publisher and pillar markup stays escaped', async () => {
  const dirtyContent = clone(content); dirtyContent.pillars[0].headline = '<img src=x onerror=alert(1)>'; dirtyContent.pillars[0].resources[0].url = 'javascript:alert(1)';
  const dirtyFeed = clone(feed); dirtyFeed.articles[0].title = '<img src=x> Quantum processor'; dirtyFeed.articles[0].summary = '<script>alert(1)</script> Quantum hardware.'; dirtyFeed.articles[1].url = 'javascript:alert(1)';
  const safe = setup({catalog:dirtyContent,edition:dirtyFeed}); await safe.ready; assert.equal(safe.$('#quantum-ai img,#quantum-ai script'),null); assert.equal(safe.$('#quantum-ai a[href^="javascript:"]'),null); assert.match(safe.$('#ai-pillar-panel h3').textContent,/<img/); assert.match(safe.$('#quantum-ai-news-grid').textContent,/<script/); assert.deepEqual(safe.errors,[]); safe.cleanup();
});
await check('Missing publication/check dates are labeled and never replaced with a fabricated date', async () => {
  const undated = clone(feed); undated.checkedAt = null; undated.articles.forEach(article=>{article.publishedAt=null;});
  const other = setup({edition:undated}); await other.ready; assert.match(other.$('#ai-news-updated').textContent,/unavailable/); assert.ok(other.$$('.ai-news-card time').every(time=>time.textContent==='Date not supplied'&&!time.hasAttribute('datetime'))); other.cleanup();
});
console.log(`\n${passed} Quantum AI checks passed.`);
