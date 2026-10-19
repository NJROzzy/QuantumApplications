import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { initToolkit, TOOLKIT_TASKS } from '../public/toolkit.js';
import { APPLICATION_NAMES, COMPANY_NAMES, LAB_NAMES } from '../public/frontier-model.js';

const html = await readFile('public/index.html', 'utf8');
const data = JSON.parse(await readFile('public/content/toolkit.json', 'utf8'));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
function setup({ fail = false } = {}) {
  const errors = [], console = new VirtualConsole(); console.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: 'https://quantum.test/', pretendToBeVisual: true, virtualConsole: console });
  const { window } = dom, { document } = window;
  window.matchMedia = () => ({ matches: true });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.fetch = async () => { if (fail) throw new Error('offline'); return { ok: true, json: async () => structuredClone(data) }; };
  const controller = initToolkit({ document, window });
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const click = selector => { const node = $(selector); assert.ok(node, selector); node.click(); };
  const input = value => { $('#toolkit-search').value = value; $('#toolkit-search').dispatchEvent(new window.Event('input')); };
  return { $, $$, click, input, window, document, controller, errors, cleanup() { controller.destroy(); dom.window.close(); } };
}

await check('Catalog entries have valid sources, learning connections, and complete technique workflows', () => {
  assert.equal(data.tools.length, 12); assert.equal(data.techniques.length, 12);
  const tools = new Set(data.tools.map(item => item.id)), techniques = new Set(data.techniques.map(item => item.id));
  assert.equal(tools.size, data.tools.length); assert.equal(techniques.size, data.techniques.length);
  for (const [type, items] of [['tools', data.tools], ['techniques', data.techniques]]) for (const item of items) {
    assert.match(item.id, /^[a-z][a-z0-9-]*$/); assert.equal(new URL(item.url).protocol, 'https:');
    assert.ok(item.applications.length); assert.ok(item.applications.every(id => Number.isInteger(id) && APPLICATION_NAMES[id]));
    assert.ok(LAB_NAMES[item.lab]); assert.ok(item.chapter >= 1 && item.chapter <= 19);
    assert.ok(item.tasks.every(id => TOOLKIT_TASKS.some(([task]) => task === id)));
    if (type === 'tools') { assert.equal(new URL(item.start).protocol, 'https:'); assert.ok(item.companies.every(id => COMPANY_NAMES[id])); assert.ok(item.techniques.every(id => techniques.has(id))); }
    else { assert.equal(item.steps.length, 3); assert.ok(item.tools.every(id => tools.has(id))); }
  }
});
const app = setup(); await app.controller.ready;
const { $, $$, click, input, window } = app;
await check('Toolkit opens six software cards with dated curation and working pagination', () => {
  assert.equal($$('#toolkit-tools-grid .toolkit-card').length, 6);
  assert.equal($('#toolkit-results').getAttribute('aria-busy'), 'false');
  assert.match($('#toolkit-reviewed').textContent, /2026-10-19/);
  click('#toolkit-more'); assert.equal($$('#toolkit-tools-grid .toolkit-card').length, 12);
  assert.ok($('#toolkit-more').hidden);
  assert.equal(window.document.activeElement, $('#toolkit-tools-grid .toolkit-card:nth-child(7) h3 button'));
});
await check('Task and text filters combine, expose empty states, and reset', () => {
  click('[data-toolkit-task="ai"]'); assert.ok($$('#toolkit-tools-grid .toolkit-card').length >= 2);
  input('PennyLane'); assert.equal($$('#toolkit-tools-grid .toolkit-card').length, 1);
  input('not-a-real-quantum-tool'); assert.match($('#toolkit-tools-grid').textContent, /Try a different direction/);
  click('#toolkit-tools-grid [data-toolkit-reset]'); assert.equal($('#toolkit-search').value, '');
  assert.equal($$('#toolkit-tools-grid .toolkit-card').length, 6);
});
await check('Technique tabs support keyboard selection and retain the selected task', () => {
  click('[data-toolkit-task="optimize"]');
  $('#toolkit-tab-tools').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($('#toolkit-tab-techniques').getAttribute('aria-selected'), 'true'); assert.ok($('#toolkit-tools-panel').hidden);
  assert.equal(window.document.activeElement, $('#toolkit-tab-techniques'));
  assert.deepEqual($$('#toolkit-techniques-grid h3 button').map(button => button.dataset.toolkitDetail), ['technique:qaoa', 'technique:annealing']);
  $('#toolkit-tab-techniques').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal($('#toolkit-tab-tools').getAttribute('aria-selected'), 'true');
  click('#quantum-toolkit [data-toolkit-reset]');
});
await check('All 24 detail profiles open with safe official links and related entries', () => {
  for (const [type, items] of [['tool', data.tools], ['technique', data.techniques]]) {
    click(type === 'tool' ? '#toolkit-tab-tools' : '#toolkit-tab-techniques');
    if (!$('#toolkit-more').hidden) click('#toolkit-more');
    for (const item of items) {
      click(`[data-toolkit-detail="${type}:${item.id}"]`);
      assert.ok($('#toolkit-dialog').open); assert.equal($('#toolkit-dialog-title').textContent, item.name);
      assert.ok($$('#toolkit-dialog [data-toolkit-detail]').length > 0);
      if (type === 'technique') assert.equal($$('#toolkit-dialog .technique-flow li').length, 3);
      for (const link of $$('#toolkit-dialog a')) { assert.equal(new URL(link.href).protocol, 'https:'); assert.equal(link.target, '_blank'); assert.match(link.rel, /noopener/); }
      click('#toolkit-dialog .toolkit-close');
    }
  }
});
await check('Related methods and tools navigate within one dialog with back navigation', () => {
  click('#toolkit-tab-tools'); click('[data-toolkit-detail="tool:qiskit"]');
  click('#toolkit-dialog [data-toolkit-detail="technique:vqe"]');
  assert.match($('#toolkit-dialog-title').textContent, /Variational/);
  assert.equal($$('dialog[open]').length, 1); click('[data-toolkit-back]');
  assert.equal($('#toolkit-dialog-title').textContent, 'Qiskit'); click('#toolkit-dialog .toolkit-close');
});
await check('Comparison enforces a three-tool limit and renders source-linked workflow differences', () => {
  for (const id of ['qiskit', 'cirq', 'pennylane']) click(`#toolkit-tools-grid [data-compare-id="${id}"]`);
  assert.equal($$('#toolkit-selected button').length, 3); assert.ok($('#toolkit-tools-grid [data-compare-id="qdk"]').disabled);
  click('#toolkit-compare-open'); assert.ok($('#toolkit-compare-dialog').open);
  assert.equal($$('#toolkit-compare-dialog thead th').length, 4);
  assert.match($('#toolkit-compare-content').textContent, /Local state tools/);
  assert.match($('#toolkit-compare-content').textContent, /automatic differentiation|Variational algorithms/);
  assert.equal($$('#toolkit-compare-dialog a').length, 3);
  click('#toolkit-compare-dialog .toolkit-close'); click('#toolkit-selected [data-compare-id="cirq"]');
  assert.equal($$('#toolkit-selected button').length, 2); assert.ok(!$('#toolkit-tools-grid [data-compare-id="qdk"]').disabled);
  click('#toolkit-compare-clear'); assert.ok($('#toolkit-comparison').hidden);
});
await check('Selections persist across search and technique views until explicitly cleared', () => {
  click('#toolkit-tools-grid [data-compare-id="qiskit"]'); input('Cirq');
  assert.match($('#toolkit-selected').textContent, /Qiskit/);
  click('#toolkit-tab-techniques'); assert.equal($$('#toolkit-selected button').length, 1);
  click('#toolkit-compare-clear'); assert.ok($('#toolkit-comparison').hidden); input('');
});
await check('Search indexes software languages and related technique names', () => {
  click('#toolkit-tab-tools'); input('C++');
  assert.deepEqual($$('#toolkit-tools-grid h3 button').map(button => button.textContent), ['CUDA-Q', 'Stim']);
  input('eigensolver'); assert.ok($$('#toolkit-tools-grid .toolkit-card').length >= 3); input('');
});
await check('External company and application contexts filter both views and can be removed', () => {
  const trigger = window.document.createElement('button'); trigger.dataset.toolkitCompany = 'ibm'; window.document.body.append(trigger); trigger.click();
  assert.equal($$('#toolkit-tools-grid .toolkit-card').length, 1); assert.match($('#toolkit-context').textContent, /IBM/);
  click('#toolkit-tab-techniques'); assert.ok($$('#toolkit-techniques-grid .toolkit-card').length >= 1);
  click('#clear-toolkit-context'); assert.ok($('#toolkit-context').hidden);
  trigger.removeAttribute('data-toolkit-company'); trigger.dataset.toolkitApp = '3'; trigger.click();
  assert.equal($$('#toolkit-tools-grid h3 button')[0].textContent, 'QuTiP'); assert.ok($('#toolkit-search') === window.document.activeElement);
  trigger.remove(); click('#clear-toolkit-context');
});
assert.deepEqual(app.errors, []); app.cleanup();
await check('A catalog outage presents a clear fallback without a false loaded state', async () => {
  const failed = setup({ fail: true }); await failed.controller.ready;
  assert.match(failed.$('#toolkit-tools-grid').textContent, /could not load/); assert.ok(failed.$('#toolkit-more').hidden);
  assert.equal(failed.$('#toolkit-results').getAttribute('aria-busy'), 'false'); assert.deepEqual(failed.errors, []); failed.cleanup();
});
console.log(`\n${passed} toolkit checks passed.`);
