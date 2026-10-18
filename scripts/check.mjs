import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { initSimulations } from '../public/simulations.js';

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
let animationId = 0;
const animationFrames = new Map();
window.requestAnimationFrame = callback => { const id = ++animationId; animationFrames.set(id, callback); return id; };
window.cancelAnimationFrame = id => animationFrames.delete(id);
const advanceAnimation = time => { const callbacks = [...animationFrames.values()]; animationFrames.clear(); callbacks.forEach(callback => callback(time)); };
let canvasDraws = 0;
const numericArguments = (...args) => { for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `Invalid canvas coordinate: ${value}`); };
const context = new Proxy({
  createLinearGradient: () => ({ addColorStop: numericArguments }),
  createRadialGradient: () => ({ addColorStop: numericArguments }),
  clearRect: (...args) => { numericArguments(...args); canvasDraws++; },
}, { get: (target, key) => key in target ? target[key] : numericArguments });
window.HTMLCanvasElement.prototype.getContext = () => context;
window.HTMLCanvasElement.prototype.getBoundingClientRect = function () { return { width: 600, height: this.id === 'quantum-canvas' ? 700 : 270, left: 0, top: 0 }; };
window.HTMLElement.prototype.scrollIntoView = function () {};
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
window.fetch = async () => ({ ok: true, json: async () => guide });
window.initSimulations = initSimulations;
window.eval(source.replace(/^import \{ initSimulations \} from '.\/simulations.js';\s*/, ''));
const $ = selector => window.document.querySelector(selector);
const $$ = selector => [...window.document.querySelectorAll(selector)];
const click = selector => { const element = $(selector); assert.ok(element, `Missing control ${selector}`); element.click(); };
const input = (selector, value) => { $(selector).value = value; $(selector).dispatchEvent(new window.Event('input', { bubbles: true })); };
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
await check('Hero modes, energy, and motion controls respond to input', () => {
  click('[data-visual="wave"]');
  assert.equal($('#hero-mode-label').textContent, 'INTERFERENCE FIELD');
  assert.equal($('#hero-mode-index').textContent, '02 / 03');
  click('[data-visual="network"]');
  assert.equal($('#hero-mode-label').textContent, 'CORRELATED SYSTEMS');
  input('#visual-energy', 87);
  assert.equal($('#visual-energy-output').textContent, '87%');
  assert.equal($('#hero-motion').getAttribute('aria-pressed'), 'true');
  click('#hero-motion');
  assert.equal($('#hero-motion').getAttribute('aria-pressed'), 'false');
  click('#hero-motion');
});
await check('Qubit phase and X/Y/Z measurement bases change probabilities correctly', () => {
  click('[data-state="90"]'); click('[data-basis="X"]');
  assert.equal($('#p-zero').textContent, '100%');
  input('#phi', 180);
  assert.equal($('#p-zero').textContent, '0%');
  input('#phi', 90); click('[data-basis="Y"]');
  assert.equal($('#p-zero').textContent, '100%');
  input('#qubit-noise', 100);
  for (const basis of ['X', 'Y', 'Z']) { click(`[data-basis="${basis}"]`); assert.equal($('#p-zero').textContent, '50%'); }
  assert.equal($('#qubit-state-type').textContent, 'MIXED STATE');
  assert.equal(Number($('#state-point').getAttribute('cx')), 150);
  assert.equal(Number($('#state-point').getAttribute('cy')), 130);
});
await check('Gates transform the state, record a sequence, and support undo', () => {
  click('#reset-lab'); click('[data-state="0"]');
  click('[data-gate="X"]');
  assert.equal($('#p-one').textContent, '100%');
  click('#measure');
  assert.match($('#measurement-results').textContent, /100\.0% one/);
  click('#undo-gate');
  assert.equal($('#p-zero').textContent, '100%');
  assert.match($('#measurement-results').textContent, /AWAITING/);
  click('[data-gate="H"]'); click('[data-basis="X"]');
  assert.equal($('#p-zero').textContent, '100%');
  click('[data-gate="Z"]');
  assert.equal($('#p-one').textContent, '100%');
  assert.match($('#gate-history').textContent, /H → Z/);
  click('[data-challenge="qubit"]');
  assert.match($('#measurement-results').textContent, /100\.0% positive/);
  assert.equal($$('.shot').length, 80);
});
await check('All four experiments switch with keyboard controls and maintain panel semantics', () => {
  for (const name of ['slit', 'bell', 'tunnel', 'qubit']) {
    click(`[data-simulation="${name}"]`);
    assert.equal($(`#simulation-${name}`).hidden, false);
    assert.equal($(`#tab-${name}`).getAttribute('aria-selected'), 'true');
    assert.equal($$('.simulation-panel:not([hidden])').length, 1);
  }
  $('#tab-qubit').focus();
  $('.simulation-tabs').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($('#simulation-slit').hidden, false);
  assert.equal(window.document.activeElement.id, 'tab-slit');
});
await check('Double-slit detections accumulate and changes clear incompatible results', () => {
  click('#slit-fire'); assert.equal($('#slit-count').textContent, '200');
  click('#slit-fire'); assert.equal($('#slit-count').textContent, '400');
  assert.equal($('#export-experiment').disabled, false);
  const coherent = $('#slit-curve').getAttribute('d');
  $('#which-path').checked = true; $('#which-path').dispatchEvent(new window.Event('change'));
  assert.equal($('#slit-count').textContent, '0');
  assert.notEqual($('#slit-curve').getAttribute('d'), coherent);
  assert.match($('#slit-mode-badge').textContent, /RECORDED/);
  click('#slit-fire');
  input('#slit-wavelength', 650);
  assert.equal($('#slit-count').textContent, '0');
  assert.equal($('#slit-wavelength-output').textContent, '650 nm');
  click('#slit-toggle'); assert.equal($('#slit-toggle').getAttribute('aria-pressed'), 'true');
  click('[data-simulation="bell"]'); assert.equal($('#slit-toggle').getAttribute('aria-pressed'), 'false');
});
await check('Entangled-pair measurements normalize, correlate, and reset correctly', () => {
  click('[data-challenge="bell"]');
  const counts = $$('.histogram-column>small').map(element => parseInt(element.textContent));
  assert.equal(counts.reduce((a, b) => a + b, 0), 200);
  assert.equal(counts[1] + counts[2], 0);
  assert.equal($('#bell-correlation').textContent, '+1.000');
  input('#bob-angle', 90);
  assert.equal($('#bell-correlation').textContent, '-1.000');
  click('#bell-measure');
  const anti = $$('.histogram-column>small').map(element => parseInt(element.textContent));
  assert.equal(anti[0] + anti[3], 0);
  input('#bell-noise', 100);
  assert.equal($('#bell-matches').textContent, '50.0%');
  assert.equal($('#export-experiment').disabled, true);
});
await check('The Bell test uses four settings and labels simulated CHSH results', () => {
  click('#bell-reset'); click('#bell-chsh');
  assert.match($('#bell-test-result').textContent, /1,200 pairs/);
  assert.equal($$('.chsh-values strong')[1].textContent, '2.828');
  assert.equal($$('.chsh-values strong')[2].textContent, '2.000');
  assert.equal($('#export-experiment').disabled, false);
  input('#bell-noise', 100); click('#bell-chsh');
  assert.equal($$('.chsh-values strong')[1].textContent, '0.000');
});
await check('Tunneling counts conserve particles and respond to barrier parameters', () => {
  click('[data-simulation="tunnel"]'); click('#tunnel-fire');
  assert.equal(Number($('#tunnel-transmitted').textContent) + Number($('#tunnel-reflected').textContent), 100);
  assert.equal($('#tunnel-total').textContent, '100');
  const before = parseFloat($('#tunnel-transmission').textContent);
  input('#tunnel-width', 2.5);
  assert.ok(parseFloat($('#tunnel-transmission').textContent) < before);
  assert.equal($('#tunnel-total').textContent, '0');
  input('#tunnel-energy', 2.5);
  assert.match($('#tunnel-regime').textContent, /SCATTERING/);
  input('#tunnel-energy', 1.5);
  assert.match($('#tunnel-regime').textContent, /THRESHOLD/);
  assert.ok(!$('#tunnel-curve').getAttribute('d').includes('NaN'));
  click('#tunnel-toggle'); assert.equal($('#tunnel-toggle').getAttribute('aria-pressed'), 'true');
  click('[data-simulation="qubit"]'); assert.equal($('#tunnel-toggle').getAttribute('aria-pressed'), 'false');
});
await check('Focus view can be entered and exited using Escape', () => {
  click('#lab-focus');
  assert.equal($('#simulation-workbench').classList.contains('lab-focus'), true);
  assert.equal($('#simulation-workbench').getAttribute('aria-modal'), 'true');
  assert.equal($('.site-header').inert, true);
  const focusable = [...$('#simulation-workbench').querySelectorAll('button:not([disabled]),input,a[href]')].filter(element => !element.closest('[hidden]') && element.tabIndex !== -1);
  focusable.at(-1).focus();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(window.document.activeElement, focusable[0]);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal($('#simulation-workbench').classList.contains('lab-focus'), false);
  assert.equal($('#lab-focus').getAttribute('aria-pressed'), 'false');
  assert.equal($('#simulation-workbench').hasAttribute('aria-modal'), false);
  assert.ok(!$('.site-header').inert);
});
await check('Application details can launch a related simulation and close the dialog', () => {
  click('[data-filter="all"]'); click('[data-app="0"]');
  assert.equal($('#application-dialog').open, true);
  click('#application-dialog [data-launch-sim]');
  assert.equal($('#application-dialog').open, false);
  assert.equal($('#simulation-tunnel').hidden, false);
});
await check('Simulation result export includes parameters, model assumptions, and counts', async () => {
  let blob, filename;
  const originalClick = window.HTMLAnchorElement.prototype.click;
  window.URL.createObjectURL = value => { blob = value; return 'blob:quantum-test'; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { filename = this.download; };
  click('#tunnel-fire'); click('#export-experiment');
  assert.equal(filename, 'quantum-tunnel-experiment.json');
  const json = await new Promise((resolve, reject) => { const reader = new window.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.onerror = reject; reader.readAsText(blob); });
  assert.equal(json.educationalSimulation, true);
  assert.equal(json.parameters.width, 2.5);
  assert.equal(json.counts.transmitted + json.counts.reflected, 100);
  assert.equal(json.experiment, 'tunnel');
  window.HTMLAnchorElement.prototype.click = originalClick;
});
await check('Canvas renderers execute with finite coordinates for both chambers', () => {
  const before = canvasDraws;
  click('[data-simulation="slit"]'); click('#slit-fire');
  click('[data-simulation="tunnel"]'); click('#tunnel-fire');
  assert.ok(canvasDraws > before + 2);
  click('[data-simulation="qubit"]');
});
await check('Continuous sources advance with time and pause when switching experiments', () => {
  click('[data-simulation="slit"]'); click('#slit-reset'); click('#slit-toggle');
  for (const time of [20, 60, 100, 140, 180, 220]) advanceAnimation(time);
  assert.ok(Number($('#slit-count').textContent) > 0);
  const photons = $('#slit-count').textContent;
  click('[data-simulation="tunnel"]'); click('#tunnel-reset'); click('#tunnel-toggle');
  for (const time of [260, 300, 340, 380, 420, 460]) advanceAnimation(time);
  assert.ok(Number($('#tunnel-total').textContent) > 0);
  assert.equal($('#slit-count').textContent, photons);
  const particles = $('#tunnel-total').textContent;
  click('[data-simulation="qubit"]'); advanceAnimation(500); advanceAnimation(600);
  assert.equal($('#tunnel-total').textContent, particles);
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
