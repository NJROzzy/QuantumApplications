import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { buildUniverse, NODE_KINDS, neighbors, tracePath, orbitLayout, pioneerId } from '../public/universe-model.js';
import { initUniverse } from '../public/universe.js';
import { initEvolution } from '../public/evolution.js';
import { LAB_NAMES } from '../public/frontier-model.js';

const html = await readFile('public/index.html', 'utf8');
const catalogs = Object.fromEntries(await Promise.all(['evolution','toolkit','industry','innovators'].map(async name => [name, JSON.parse(await readFile(`public/content/${name}.json`, 'utf8'))])));
const { evolution } = catalogs, milestones = evolution.eras.flatMap(era => era.events);
const graph = buildUniverse(catalogs);
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
function setup({ fail = '', saved = null, content = catalogs } = {}) {
  const errors = [], virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: 'https://quantum.test/', pretendToBeVisual: true, virtualConsole });
  const { window } = dom, { document } = window;
  window.matchMedia = () => ({ matches: true });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  if (saved !== null) window.localStorage.setItem('quantum-story-chapter-v1', saved);
  window.fetch = async url => {
    const name = url.match(/\/([^/]+)\.json$/)?.[1];
    if (name === fail) throw new Error('offline');
    return { ok: true, json: async () => structuredClone(content[name]) };
  };
  const story = initEvolution({ document, window });
  const universe = initUniverse({ document, window, evolutionReady: story.ready });
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const click = selector => { const element = $(selector); assert.ok(element, selector); element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
  const send = (name, detail) => document.dispatchEvent(new window.CustomEvent(name, { detail }));
  const input = (selector, value, type = 'input') => { $(selector).value = value; $(selector).dispatchEvent(new window.Event(type)); };
  const select = id => send('quantum:universe-select', { id });
  const keys = (selector, key) => { $(selector).focus(); $(selector).dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); };
  return { $, $$, click, send, input, select, keys, document, window, errors, story, universe, ready: Promise.all([story.ready, universe.ready]), cleanup() { story.destroy(); universe.destroy(); dom.window.close(); } };
}

await check('The universe has 119 distinct topics across all eight categories and 334 labeled edges', () => {
  assert.equal(graph.nodes.length, 119); assert.equal(graph.edges.length, 334);
  assert.equal(new Set(graph.nodes.map(node => node.id)).size, graph.nodes.length);
  for (const kind of Object.keys(NODE_KINDS)) assert.ok(graph.nodes.some(node => node.kind === kind));
  for (const edge of graph.edges) { assert.ok(graph.byId.has(edge.source)); assert.ok(graph.byId.has(edge.target)); assert.notEqual(edge.source, edge.target); assert.ok(edge.relation && edge.detail); if (edge.sourceUrl) assert.equal(new URL(edge.sourceUrl).protocol, 'https:'); }
});
await check('Every topic is reachable, and traced paths contain only real adjacent relationships', () => {
  for (const node of graph.nodes) {
    const path = tracePath(graph, 'concept:entanglement', node.id); assert.ok(path);
    assert.equal(path[0], 'concept:entanglement'); assert.equal(path.at(-1), node.id);
    path.slice(1).forEach((id, i) => assert.ok(neighbors(graph, path[i]).some(item => item.id === id)));
  }
  assert.deepEqual(tracePath(graph, 'concept:spin', 'application:1'), ['concept:spin','application:1']);
  assert.deepEqual(tracePath(graph, 'software:qiskit', 'software:qiskit'), ['software:qiskit']);
  assert.equal(tracePath(graph, 'missing', 'concept:spin'), null);
  assert.equal(tracePath({ ...graph, adjacency: new Map() }, 'concept:spin', 'concept:entanglement'), null);
});
await check('Orbit coordinates are finite, bounded, unique, and capped at twelve visible neighbors', () => {
  assert.deepEqual(orbitLayout(0), []);
  for (const count of [1, 6, 12, 100]) {
    const points = orbitLayout(count); assert.equal(points.length, Math.min(count, 12));
    assert.equal(new Set(points.map(p => `${p.x},${p.y}`)).size, points.length);
    for (const p of points) { assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y)); assert.ok(p.x >= 125 && p.x <= 775 && p.y >= 95 && p.y <= 505); }
  }
});
await check('History credits pioneers, distinguishes earlier optics, and preserves dated primary sources', () => {
  assert.equal(evolution.eras.length, 4); assert.equal(milestones.length, 27);
  assert.equal(new Set(milestones.map(event => event.id)).size, 27);
  assert.match(evolution.intro, /no single founder/);
  for (const name of ['Max Planck','Albert Einstein','Satyendra Nath Bose','Niels Bohr','Werner Heisenberg','Max Born','Pascual Jordan','Erwin Schrödinger','John Stewart Bell','Richard Feynman','Peter Shor','Andrew Steane']) assert.ok(graph.byId.has(pioneerId(name)), name);
  assert.match(milestones.find(event => event.id === 'young').text, /classical-optics predecessor/);
  assert.match(milestones.find(event => event.id === 'pqc').text, /classical algorithms/);
  assert.match(milestones.find(event => event.id === 'nobel-circuits').text, /1980s/);
  for (const event of milestones) {
    assert.equal(new URL(event.source.url).protocol, 'https:'); assert.ok(event.source.title && event.year && event.title && event.text);
    assert.ok(event.people.length || event.contributors); assert.ok(LAB_NAMES[event.lab]);
    for (const id of event.topics) assert.ok(graph.byId.has(`concept:${id}`));
  }
});
await check('All six narrative chapters have valid milestones, guide/lab links, and connected routes', () => {
  assert.equal(evolution.story.length, 6);
  for (const chapter of evolution.story) {
    assert.ok(chapter.paragraphs.length >= 2 && chapter.question && chapter.takeaway);
    assert.ok(chapter.chapter >= 1 && chapter.chapter <= 19 && LAB_NAMES[chapter.lab]);
    for (const id of chapter.events) assert.ok(milestones.some(event => event.id === id));
    chapter.route.forEach((id, i) => { assert.ok(graph.byId.has(id)); if (i) assert.ok(neighbors(graph, chapter.route[i - 1]).some(item => item.id === id)); });
  }
});

const app = setup(); await app.ready;
const { $, $$, click, send, input, select, keys, document, window } = app;
await check('The initial map exposes full accessible names, its limits, and all neighbor buttons', () => {
  assert.equal($('#universe-console').getAttribute('aria-busy'), 'false');
  assert.match($('#universe-total').textContent, /119 topics · 334 labeled connections/);
  assert.equal($('#universe-selected-title').textContent, 'Entanglement');
  const direct = neighbors(graph, 'concept:entanglement');
  assert.equal($$('#universe-map [role="button"]').length, Math.min(direct.length, 12));
  assert.equal($$('#universe-connections button').length, 6);
  click('#universe-connections-more'); assert.equal($$('#universe-connections button').length, direct.length);
  for (const button of $$('#universe-map [role="button"]')) { assert.equal(button.getAttribute('tabindex'), '0'); assert.ok(button.getAttribute('aria-label').includes(graph.byId.get(button.dataset.universeNode).label)); }
  assert.match($('.universe-model-note').textContent, /not a physical model/);
});
await check('Selecting a neighbor recenters the map, explains the edge, and supports back/reset', () => {
  const target = $('#universe-connections button').dataset.universeNode;
  click('#universe-connections button'); assert.equal($('#universe-selected-title').textContent, graph.byId.get(target).label);
  assert.match($('.universe-arrival').textContent, /FROM Entanglement/);
  assert.equal(document.activeElement, $('#universe-selected-title'));
  click('#universe-back'); assert.equal($('#universe-selected-title').textContent, 'Entanglement'); assert.ok($('#universe-back').disabled);
  select('software:qiskit'); click('#universe-reset'); assert.equal($('#universe-selected-title').textContent, 'Entanglement');
});
await check('SVG topics support arrow, Home/End, and Enter/Space without a pointer', () => {
  keys('#universe-map [data-universe-node]', 'End');
  assert.equal(document.activeElement, $$('#universe-map [data-universe-node]').at(-1));
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal(document.activeElement, $('#universe-map [data-universe-node]'));
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const target = document.activeElement.dataset.universeNode;
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal($('#universe-selected-title').textContent, graph.byId.get(target).label);
  const second = $('#universe-map [data-universe-node]').dataset.universeNode;
  keys('#universe-map [data-universe-node]', ' '); assert.equal($('#universe-selected-title').textContent, graph.byId.get(second).label);
});
await check('Search normalizes diacritics and category filters affect the index while preserving map context', () => {
  input('#universe-search', 'vuckovic'); assert.match($('#universe-search-results').textContent, /Jelena Vučković/);
  input('#universe-search', ''); select('concept:entanglement');
  const before = $$('#universe-map [data-universe-node]').map(node => node.dataset.universeNode);
  input('#universe-kind', 'company', 'change'); assert.equal($$('#universe-search-results button').length, 8);
  assert.deepEqual($$('#universe-map [data-universe-node]').map(node => node.dataset.universeNode), before);
  click('#universe-results-more'); assert.equal($$('#universe-search-results button').length, 10); assert.ok($('#universe-results-more').hidden);
  input('#universe-search', '<img src=x onerror=alert(1)>'); assert.match($('#universe-search-results').textContent, /No topics/); assert.equal($('#universe-search-results img'), null);
  click('#universe-reset'); assert.equal($('#universe-search').value, ''); assert.equal($('#universe-kind').value, 'all');
});
await check('The route builder finds a path, explains each original relationship, and handles endpoints', () => {
  $('#universe-from').value = 'software:cirq'; $('#universe-to').value = 'application:1'; click('#universe-trace');
  const path = tracePath(graph, 'software:cirq', 'application:1');
  assert.equal($('#universe-route').hidden, false); assert.equal($$('#universe-route-steps button').length, path.length); assert.ok($('#universe-route-previous').disabled);
  for (let i = 1; i < path.length; i++) {
    click('#universe-route-next'); assert.equal($('#universe-selected-title').textContent, graph.byId.get(path[i]).label);
    const edge = neighbors(graph, path[i - 1]).find(item => item.id === path[i]).edge;
    assert.ok($('#universe-route-explanation').textContent.includes(`${graph.byId.get(edge.source).label} → ${edge.relation} → ${graph.byId.get(edge.target).label}`));
    assert.equal($$('#universe-route-steps [aria-current="step"]').length, 1);
  }
  assert.ok($('#universe-route-next').disabled); click('#universe-route-previous'); assert.match($('#universe-route-position').textContent, new RegExp(`Step ${path.length - 1} of`));
  click('[data-route-step="0"]'); assert.ok($('#universe-route-previous').disabled);
  click('#universe-route-close'); assert.ok($('#universe-route').hidden);
  $('#universe-from').value = 'concept:spin'; $('#universe-to').value = 'concept:spin'; click('#universe-trace');
  assert.ok($('#universe-route-next').disabled && $('#universe-route-previous').disabled);
  $('#universe-to').value = ''; click('#universe-trace'); assert.match($('#universe-path-error').textContent, /No connected path/);
});
await check('All four guided journeys expose the promised sequence and retain the next topic on the map', () => {
  for (const index of [0,2,3,5]) {
    click(`[data-universe-journey="${index}"]`); const chapter = evolution.story[index];
    assert.equal($('#universe-route-title').textContent, chapter.title);
    assert.equal($$('#universe-route-steps button').length, chapter.route.length);
    assert.ok($(`#universe-map [data-universe-node="${chapter.route[1]}"]`));
    click(`#universe-route-steps [data-route-step="${chapter.route.length - 1}"]`); assert.ok($('#universe-route-next').disabled);
  }
});
await check('Invalid selection and disconnected supplied routes leave the current topic intact', () => {
  const title = $('#universe-selected-title').textContent;
  select('bad-id'); send('quantum:universe-route', { path: ['pioneer:max-planck','company:ibm'] });
  assert.equal($('#universe-selected-title').textContent, title);
});
await check('All six story chapters render milestones, guide/lab actions, progress, and boundary controls', () => {
  click('#story-restart'); assert.ok($('#story-previous').disabled);
  for (let i = 0; i < 6; i++) {
    click(`[data-story-chapter="${i}"]`); const chapter = evolution.story[i];
    assert.equal($('#story-panel h3').textContent, chapter.title);
    assert.equal($('#story-panel').getAttribute('aria-labelledby'), `story-chapter-${i}`);
    assert.equal($('#story-progress').value, i + 1); assert.match($('#story-position').textContent, new RegExp(`Chapter ${i + 1} of 6`));
    assert.equal($$('#story-panel [data-milestone]').length, chapter.events.length);
    assert.equal($('#story-panel [data-launch-sim]').dataset.launchSim, chapter.lab);
    assert.equal(Number($('#story-panel [data-chapter]').dataset.chapter), chapter.chapter);
    assert.equal($('#era-' + chapter.era).getAttribute('aria-selected'), 'true');
    assert.equal(window.localStorage.getItem('quantum-story-chapter-v1'), String(i));
  }
  assert.ok($('#story-next').disabled); click('#story-previous'); assert.equal($('#story-progress').value, 5);
  click('#story-next'); assert.equal($('#story-progress').value, 6);
});
await check('Story and timeline tabs support keyboard navigation with a single selected tab', () => {
  keys('#story-chapter-5', 'ArrowRight'); assert.equal($('#story-chapter-0').getAttribute('aria-selected'), 'true');
  keys('#story-chapter-0', 'End'); assert.equal(document.activeElement, $('#story-chapter-5'));
  keys('#story-chapter-5', 'Home'); assert.equal(document.activeElement, $('#story-chapter-0'));
  keys('#era-0', 'ArrowLeft'); assert.equal($('#era-3').getAttribute('aria-selected'), 'true');
  keys('#era-3', 'Home'); assert.equal($('#era-0').getAttribute('aria-selected'), 'true');
  assert.equal($$('.era-tabs [tabindex="0"]').length, 1); assert.equal($$('#story-chapters [tabindex="0"]').length, 1);
});
await check('Story sources focus the matching milestone and historical connections reopen the map', () => {
  click('#story-chapter-3'); click('[data-milestone="epr"]');
  assert.equal($('#era-1').getAttribute('aria-selected'), 'true'); assert.equal(document.activeElement, $('#milestone-epr'));
  click('#milestone-bell [data-evolution-universe]'); assert.equal($('#universe-selected-title').textContent, 'John Stewart Bell');
  click('#universe-detail [data-universe-event]'); assert.equal(document.activeElement, $('#milestone-bell'));
  click('[data-universe-story]'); assert.equal($('#story-panel h3').textContent, evolution.story[0].title);
});
await check('Every story thread starts its actual connected universe route', () => {
  for (let i = 0; i < 6; i++) {
    click(`[data-story-chapter="${i}"]`); click('#story-panel [data-story-universe]');
    assert.equal($('#universe-route-title').textContent, evolution.story[i].title);
    assert.equal($('#universe-selected-title').textContent, graph.byId.get(evolution.story[i].route[0]).label);
  }
});
await check('Map source links remain HTTPS and open with safe external-link attributes', () => {
  for (const id of ['pioneer:max-planck','project:magic-states','software:qiskit','company:ibm']) {
    select(id); const source = $('#universe-detail a'); assert.ok(source); assert.equal(new URL(source.href).protocol, 'https:'); assert.equal(source.target, '_blank'); assert.match(source.rel, /noopener/);
  }
  for (let i = 0; i < 4; i++) { click(`[data-era="${i}"]`); for (const link of $$('#timeline-panel a')) { assert.equal(new URL(link.href).protocol, 'https:'); assert.match(link.rel, /noopener/); } }
});
assert.deepEqual(app.errors, []); app.cleanup();

await check('A saved story resumes, and an explicit timeline request received during loading takes precedence', async () => {
  const resumed = setup({ saved: '4' }); await resumed.ready; assert.equal(resumed.$('#story-progress').value, 5); resumed.cleanup();
  const requested = setup({ saved: '4' }); requested.send('quantum:timeline', { era: 3 }); await requested.ready;
  assert.equal(requested.$('#era-3').getAttribute('aria-selected'), 'true'); requested.cleanup();
  const invalid = setup({ saved: '999' }); await invalid.ready; assert.equal(invalid.$('#story-progress').value, 1); invalid.cleanup();
});
await check('Universe selections and routes received before loading are applied after catalogs arrive', async () => {
  const queued = setup(); queued.select('software:qiskit'); await queued.ready; assert.equal(queued.$('#universe-selected-title').textContent, 'Qiskit'); queued.cleanup();
  const routed = setup(); routed.send('quantum:universe-route', { path: evolution.story[2].route, title: evolution.story[2].title }); await routed.ready;
  assert.equal(routed.$('#universe-route-title').textContent, evolution.story[2].title); routed.cleanup();
});
await check('Untrusted catalog text is escaped and unsafe external URLs are suppressed', async () => {
  const content = structuredClone(catalogs);
  content.innovators.people[0].name = '<img src=x onerror=alert(1)>'; content.innovators.people[0].url = 'javascript:alert(1)';
  content.evolution.eras[0].events[0].title = '<img src=x>'; content.evolution.eras[0].events[0].source.url = 'javascript:alert(1)';
  const safe = setup({ content }); await safe.ready; safe.select('person:jay-gambetta');
  assert.equal(safe.$('#universe-detail img'), null); assert.match(safe.$('#universe-selected-title').textContent, /<img/);
  assert.equal(safe.$('#universe-detail a[href^="javascript:"]'), null); safe.click('#era-0'); assert.equal(safe.$('#timeline-panel img'), null); assert.equal(safe.$('#timeline-panel a[href^="javascript:"]'), null);
  assert.deepEqual(safe.errors, []); safe.cleanup();
});
await check('Catalog or history outages are labeled and leave the guide and other sections usable', async () => {
  for (const fail of ['toolkit','evolution']) {
    const failed = setup({ fail }); await failed.ready;
    assert.match(failed.$('#universe-map').textContent, /could not load/); assert.equal(failed.$('#universe-console').getAttribute('aria-busy'), 'false');
    assert.ok(failed.$('#applications') && failed.$('[data-guide]'));
    if (fail === 'evolution') { assert.match(failed.$('#story-panel').textContent, /could not load/); assert.ok(failed.$('#story-next').disabled); }
    assert.deepEqual(failed.errors, []); failed.cleanup();
  }
});
console.log(`\n${passed} universe and evolution checks passed.`);
