import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = await readFile('public/index.html', 'utf8');
const source = await readFile('public/app.js', 'utf8');
const guide = JSON.parse(await readFile('public/content/guide.json', 'utf8'));
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error));
const dom = new JSDOM(html, { url: 'https://quantum.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
const { window } = dom;
window.matchMedia = () => ({ matches: true, addEventListener() {} });
window.IntersectionObserver = class { observe() {} disconnect() {} };
window.ResizeObserver = class { observe() {} disconnect() {} };
window.HTMLCanvasElement.prototype.getContext = () => null;
window.HTMLElement.prototype.scrollIntoView = function () {};
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
window.fetch = async () => ({ ok: true, json: async () => guide });
window.eval(source);
const $ = selector => window.document.querySelector(selector);
const $$ = selector => [...window.document.querySelectorAll(selector)];
const click = selector => { const element = $(selector); assert.ok(element, `Missing control ${selector}`); element.click(); };
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }

await check('All 19 source chapters and all eight tables are retained', () => {
  assert.deepEqual(guide.chapters.map(chapter => chapter.id), Array.from({ length: 19 }, (_, i) => i + 1));
  assert.equal(guide.chapters.flatMap(chapter => chapter.blocks).filter(block => block.type === 'table').length, 8);
  assert.equal(guide.chapters.find(chapter => chapter.id === 8).blocks[0].rows.length, 16);
});
await check('Every local stylesheet, script, icon, and document download exists', async () => {
  const paths = [...$$('link[href],script[src],a[download]')].map(element => element.getAttribute('href') || element.getAttribute('src')).filter(path => path.startsWith('/'));
  await Promise.all(paths.map(path => access('public' + path)));
});
await check('Every in-page link and tab panel resolves to a unique element', () => {
  const ids = $$('[id]').map(element => element.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const link of $$('a[href^="#"]')) { if (link.hash) assert.ok($(link.hash), `Missing anchor ${link.hash}`); }
  for (const tab of $$('[role="tab"]')) assert.ok(window.document.getElementById(tab.getAttribute('aria-controls')));
});
await check('All eight foundation tabs update their content and keyboard selection', () => {
  for (let i = 0; i < 8; i++) {
    click(`[data-concept="${i}"]`);
    assert.equal($(`#concept-${i}`).getAttribute('aria-selected'), 'true');
    assert.equal($('#concept-title').textContent, $(`#concept-${i}`).textContent);
  }
  $('#concept-7').focus();
  $('#concept-tabs').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($('#concept-0').getAttribute('aria-selected'), 'true');
});
await check('Application filters, all 15 cards, and details work', () => {
  assert.equal($$('.application-card').length, 6);
  click('#more-applications');
  assert.equal($$('.application-card').length, 15);
  for (const [filter, count] of [['established', 4], ['emerging', 3], ['research', 8]]) {
    click(`[data-filter="${filter}"]`);
    assert.equal($$('.application-card').length, count);
    assert.equal($('#more-applications').hidden, true);
    click('.application-card');
    assert.equal($('#application-dialog').open, true);
    assert.ok($('#application-dialog-title').textContent.length > 0);
    click('#application-dialog .close-dialog');
  }
  click('[data-filter="all"]');
  assert.equal($$('.application-card').length, 15);
});
await check('All four timeline eras expose four historical milestones', () => {
  for (let i = 0; i < 4; i++) {
    click(`[data-era="${i}"]`);
    assert.equal($$('.timeline-item').length, 4);
    assert.equal($(`#era-${i}`).getAttribute('aria-selected'), 'true');
  }
});
await check('Qubit probabilities and measurement are exact at basis-state endpoints', () => {
  click('[data-state="0"]');
  assert.equal($('#p-zero').textContent, '100%');
  click('#measure');
  assert.match($('#measurement-results').textContent, /100\.0% zero · 0\.0% one/);
  click('[data-state="180"]');
  assert.equal($('#p-one').textContent, '100%');
  click('#measure');
  assert.match($('#measurement-results').textContent, /0\.0% zero · 100\.0% one/);
});
await check('The qubit lab follows the Born rule, accumulates shots, and resets', () => {
  $('#theta').value = 60;
  $('#theta').dispatchEvent(new window.Event('input'));
  assert.equal($('#p-zero').textContent, '75%');
  assert.equal($('#p-one').textContent, '25%');
  click('#measure'); click('#measure');
  assert.match($('#measurement-results').textContent, /200 shots/);
  click('#reset-lab');
  assert.equal($('#theta').value, '90');
  assert.equal($('#p-zero').textContent, '50%');
  assert.match($('#measurement-results').textContent, /AWAITING MEASUREMENT/);
});
await check('The complete reader opens every chapter and all source tables', async () => {
  click('[data-guide]'); await flush();
  assert.equal($('#guide-dialog').open, true);
  assert.equal($$('#chapter-nav button').length, 20);
  for (const chapter of guide.chapters) {
    click(`#chapter-nav [data-reader-chapter="${chapter.id}"]`);
    assert.equal($('#guide-article h2').textContent, chapter.title);
    assert.equal($$('#guide-article table').length, chapter.blocks.filter(block => block.type === 'table').length);
  }
});
await check('Guide search finds table content and safely handles HTML-like queries', () => {
  const search = $('#guide-search');
  search.value = 'Rydberg'; search.dispatchEvent(new window.Event('input'));
  assert.ok($$('.search-result').length > 0);
  assert.match($('#guide-article').textContent, /hardware platforms/);
  search.value = '<img src=x onerror=alert(1)>'; search.dispatchEvent(new window.Event('input'));
  assert.equal($$('#guide-article img').length, 0);
  assert.match($('#guide-article').textContent, /No chapters match/);
  search.value = ''; search.dispatchEvent(new window.Event('input'));
  assert.equal($('#guide-article h2').textContent, guide.chapters[18].title);
});
await check('Mobile navigation toggles and closes when a section is chosen', () => {
  click('.menu-button');
  assert.equal($('.menu-button').getAttribute('aria-expanded'), 'true');
  click('#main-nav a');
  assert.equal($('.menu-button').getAttribute('aria-expanded'), 'false');
});
await check('No script errors occurred during interaction checks', () => assert.deepEqual(errors, []));
dom.window.close();
console.log(`\n${passed} checks passed. Visual rendering requires a browser.`);
