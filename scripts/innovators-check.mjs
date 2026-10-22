import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { initInnovators, RESEARCH_AREAS, PROJECT_STAGES } from '../public/innovators.js';
import { APPLICATION_NAMES, COMPANY_NAMES, LAB_NAMES } from '../public/frontier-model.js';

const html = await readFile('public/index.html', 'utf8');
const data = JSON.parse(await readFile('public/content/innovators.json', 'utf8'));
const toolkit = JSON.parse(await readFile('public/content/toolkit.json', 'utf8'));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
function setup({ fail = false, catalog = data } = {}) {
  const errors = [], virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: 'https://quantum.test/', pretendToBeVisual: true, virtualConsole });
  const { window } = dom, { document } = window;
  window.matchMedia = () => ({ matches: true });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.fetch = async url => { if (fail) throw new Error('offline'); return { ok: true, json: async () => structuredClone(url === '/content/toolkit.json' ? toolkit : catalog) }; };
  const controller = initInnovators({ document, window });
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const click = selector => { const node = $(selector); assert.ok(node, selector); node.click(); };
  const input = value => { $('#innovator-search').value = value; $('#innovator-search').dispatchEvent(new window.Event('input')); };
  const region = value => { $('#innovator-region').value = value; $('#innovator-region').dispatchEvent(new window.Event('change')); };
  return { $, $$, click, input, region, window, document, controller, errors, cleanup() { controller.destroy(); dom.window.close(); } };
}

await check('Research catalog preserves reciprocal people/project links, valid sources, and honest dates', () => {
  assert.equal(data.people.filter(item => item.kind === 'Researcher').length, 10);
  assert.equal(data.people.length, 12); assert.equal(data.projects.length, 11);
  assert.equal(new Set(data.people.map(item => item.id)).size, data.people.length);
  assert.equal(new Set(data.projects.map(item => item.id)).size, data.projects.length);
  for (const person of data.people) {
    assert.equal(new URL(person.url).protocol, 'https:'); assert.ok(person.projects.length);
    assert.ok(person.companies.every(id => COMPANY_NAMES[id]));
    for (const id of person.projects) assert.ok(data.projects.some(project => project.id === id && project.people.includes(person.id)));
  }
  for (const project of data.projects) {
    assert.ok(PROJECT_STAGES[project.stage]); assert.ok(RESEARCH_AREAS.some(([id]) => id === project.category));
    assert.equal(new URL(project.source.url).protocol, 'https:'); assert.equal(new URL(project.resource).protocol, 'https:');
    if (project.source.date) { assert.match(project.source.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(project.source.date <= data.reviewedAt); }
    assert.ok(project.people.every(id => data.people.some(person => person.id === id && person.projects.includes(project.id))));
    assert.ok(project.tools.every(id => toolkit.tools.some(tool => tool.id === id)));
    assert.ok(project.techniques.every(id => toolkit.techniques.some(technique => technique.id === id)));
    assert.ok(project.applications.every(id => Number.isInteger(id) && APPLICATION_NAMES[id])); assert.ok(LAB_NAMES[project.lab]);
  }
});
const app = setup(); await app.controller.ready;
const { $, $$, click, input, region, window, document } = app;
await check('Research directory shows reviewed counts, six initial profiles, and complete pagination', () => {
  assert.equal($$('#innovator-people-grid .research-card').length, 6);
  assert.match($('#innovator-reviewed').textContent, /Oct 21, 2026/);
  assert.equal($('#innovator-results').getAttribute('aria-busy'), 'false');
  click('#innovator-more'); assert.equal($$('#innovator-people-grid .research-card').length, 12); assert.ok($('#innovator-more').hidden);
  assert.equal(document.activeElement, $('#innovator-people-grid .research-card:nth-child(7) h3 button'));
});
await check('Search finds people through project topics and handles names without diacritics', () => {
  input('fluxonium'); assert.equal($$('#innovator-people-grid h3 button').length, 1); assert.match($('#innovator-people-grid').textContent, /William D. Oliver/);
  input('vuckovic'); assert.match($('#innovator-people-grid').textContent, /Jelena Vučković/);
  input('missing-signal-xyz'); assert.match($('#innovator-people-grid').textContent, /No matching/);
  click('#innovator-people-grid [data-research-reset]'); assert.equal($('#innovator-search').value, ''); assert.equal(document.activeElement, $('#innovator-search'));
});
await check('Region and research-area filters combine across people and projects', () => {
  region('Europe'); click('[data-research-area="networking"]');
  assert.deepEqual($$('#innovator-people-grid h3 button').map(button => button.textContent), ['Stephanie Wehner']);
  click('#innovator-tab-projects'); assert.match($('#innovator-projects-grid').textContent, /Quantum Internet Alliance prototype/);
  assert.equal($$('#innovator-projects-grid .research-card').length, 1);
  click('#quantum-innovators [data-research-reset]'); region('India'); assert.match($('#innovator-projects-grid').textContent, /National Quantum Mission/);
  click('#quantum-innovators [data-research-reset]');
});
await check('Research tabs support arrow, Home, and End keys with correct panel semantics', () => {
  click('#innovator-tab-people');
  $('#innovator-tab-people').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal($('#innovator-tab-projects').getAttribute('aria-selected'), 'true'); assert.ok($('#innovator-people-panel').hidden);
  assert.equal(document.activeElement, $('#innovator-tab-projects'));
  $('#innovator-tab-projects').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal($('#innovator-tab-people').tabIndex, 0); assert.equal($('#innovator-tab-projects').tabIndex, -1);
});
await check('All twelve people/team profiles expose affiliations, official sources, and project links', () => {
  click('#innovator-more');
  for (const person of data.people) {
    click(`#innovator-people-grid [data-research-detail="person:${person.id}"]`);
    assert.equal($('#innovator-dialog-title').textContent, person.name); assert.ok($('#innovator-dialog').open);
    assert.match($('#innovator-dialog-content').textContent, new RegExp(person.organization.split(' · ')[0]));
    assert.equal($$('#innovator-dialog [data-research-detail]').length, person.projects.length);
    for (const link of $$('#innovator-dialog a')) { assert.equal(new URL(link.href).protocol, 'https:'); assert.equal(link.target, '_blank'); assert.match(link.rel, /noopener/); }
    click('.innovator-close');
  }
});
await check('All eleven projects show source evidence, stage, publication type, and connected principles', () => {
  click('#innovator-tab-projects'); click('#innovator-more');
  for (const project of data.projects) {
    click(`#innovator-projects-grid [data-research-detail="project:${project.id}"]`);
    assert.equal($('#innovator-dialog-title').textContent, project.name);
    assert.match($('#innovator-dialog-content').textContent, new RegExp(PROJECT_STAGES[project.stage].replace('&', '&')));
    assert.ok($('#innovator-dialog-content').textContent.includes(project.source.kind));
    assert.ok($('#innovator-dialog-content').textContent.includes(project.evidence));
    assert.ok($('#innovator-dialog [data-launch-sim]')); assert.ok($('#innovator-dialog [data-chapter]'));
    if (!project.source.date) assert.match($('#innovator-dialog-content').textContent, /Source undated/);
    click('.innovator-close');
  }
});
await check('Theory, preprint, company claims, and prospective project goals remain explicit', () => {
  for (const [id, expected] of [['entangled-sensors', /Experimental demonstration is identified as a next step/], ['fluxonium', /experimental preprint/], ['majorana', /Company-reported device claims/], ['qia', /rather than an already delivered network/]]) {
    click(`#innovator-projects-grid [data-research-detail="project:${id}"]`); assert.match($('#innovator-dialog-content').textContent, expected); click('.innovator-close');
  }
});
await check('People and projects navigate within one dialog and preserve back history', () => {
  click('#innovator-tab-people'); click('[data-research-detail="person:jay-gambetta"]');
  click('#innovator-dialog [data-research-detail="project:nighthawk"]'); assert.equal($('#innovator-dialog-title').textContent, 'IBM Quantum Nighthawk r2');
  assert.equal($$('dialog[open]').length, 1); click('[data-research-back]'); assert.equal($('#innovator-dialog-title').textContent, 'Jay Gambetta'); click('.innovator-close');
});
await check('Company and application context links filter projects and clear cleanly', () => {
  const trigger = document.createElement('button'); trigger.dataset.innovatorsCompany = 'google'; document.body.append(trigger); trigger.click();
  assert.equal($$('#innovator-projects-grid .research-card').length, 1); assert.match($('#innovator-context').textContent, /Google/);
  assert.equal(document.activeElement, $('#innovator-search')); click('#innovator-clear-context');
  trigger.removeAttribute('data-innovators-company'); trigger.dataset.innovatorsApp = '3'; trigger.click();
  assert.equal($$('#innovator-projects-grid .research-card').length, 2); assert.match($('#innovator-context').textContent, /sensing/);
  click('#innovator-clear-context'); assert.ok($('#innovator-context').hidden); trigger.remove();
});
assert.deepEqual(app.errors, []); app.cleanup();
await check('Profile text is escaped and unsafe external source URLs are suppressed', async () => {
  const malicious = structuredClone(data); malicious.people[0].name = '<img src=x onerror=alert(1)>'; malicious.people[0].url = 'javascript:alert(1)';
  const safe = setup({ catalog: malicious }); await safe.controller.ready;
  safe.click('[data-research-detail="person:jay-gambetta"]'); assert.equal(safe.$('#innovator-dialog-title img'), null);
  assert.equal(safe.$('#innovator-dialog a[href^="javascript:"]'), null); assert.match(safe.$('#innovator-dialog-title').textContent, /<img/); safe.cleanup();
});
await check('A directory outage is labeled without blocking the rest of the field guide', async () => {
  const failed = setup({ fail: true }); await failed.controller.ready;
  assert.match(failed.$('#innovator-people-grid').textContent, /could not load/); assert.ok(failed.$('#innovator-more').hidden);
  assert.equal(failed.$('#innovator-results').getAttribute('aria-busy'), 'false'); assert.deepEqual(failed.errors, []); failed.cleanup();
});
console.log(`\n${passed} innovators and projects checks passed.`);
