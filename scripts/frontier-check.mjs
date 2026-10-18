import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { initFrontier } from '../public/frontier.js';
import { TECHNOLOGIES, COMPANY_NAMES } from '../public/frontier-model.js';

const html = await readFile('public/index.html', 'utf8');
const industry = JSON.parse(await readFile('public/content/industry.json', 'utf8'));
const snapshot = JSON.parse(await readFile('public/content/news-snapshot.json', 'utf8'));
const clone = data => JSON.parse(JSON.stringify(data));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
function setup({ fail = false, initialCache = null, feed = snapshot } = {}) {
  const errors = [], virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, {url:'https://quantum.test',pretendToBeVisual:true,virtualConsole});
  const { window } = dom, { document } = window; let failApi = fail, apiCalls = 0, interval, intervalDelay;
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  window.matchMedia = () => ({matches:true}); window.HTMLElement.prototype.scrollIntoView = function(){};
  window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
  window.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  window.setInterval = (fn, delay) => {interval=fn;intervalDelay=delay;return 1;};window.clearInterval=()=>{};
  let hidden = false; Object.defineProperty(document,'hidden',{get:()=>hidden,configurable:true});
  if(initialCache) window.localStorage.setItem('quantum-live-v1',JSON.stringify(initialCache));
  window.fetch = async url => { if(url==='/api/news'){apiCalls++;if(failApi)throw new Error('offline');return {ok:true,json:async()=>clone(feed)};}return {ok:true,json:async()=>clone(url==='/content/industry.json'?industry:snapshot)}; };
  const controller = initFrontier({document,window});
  return {dom,window,document,$,$$,errors,controller,get apiCalls(){return apiCalls;},get intervalDelay(){return intervalDelay;},tick:()=>interval(),hide:value=>{hidden=value;},fail:value=>{failApi=value;},click:selector=>{const el=$(selector);assert.ok(el,`Missing ${selector}`);el.click();},input:(selector,value)=>{$(selector).value=value;$(selector).dispatchEvent(new window.Event('input'));},change:(selector,value)=>{$(selector).value=value;$(selector).dispatchEvent(new window.Event('change'));},close(){controller.destroy();dom.window.close();}};
}
const ui=setup();await ui.controller.ready;
await check('All ten required companies have source-linked profiles and valid technology categories',()=>{
  assert.deepEqual(new Set(industry.companies.map(company=>company.id)),new Set(Object.keys(COMPANY_NAMES)));
  for(const company of industry.companies){assert.ok(company.description&&company.areas.length&&company.achievement.summary&&company.developments.length);assert.ok(company.technologies.every(id=>TECHNOLOGIES.some(tech=>tech.id===id)));for(const url of [company.website,company.newsroom,company.achievement.url,...company.developments.map(item=>item.url),...company.sources.map(item=>item.url)])assert.equal(new URL(url).protocol,'https:');}
  assert.equal(ui.$$('.industry-card').length,10);
});
await check('News displays a balanced first page with original dates and source labels',()=>{
  assert.equal(ui.$$('.news-card').length,6);assert.equal(ui.$$('#news-sources button').length,5);assert.equal(ui.$$('#news-categories button').length,6);
  assert.match(ui.$('#news-health').textContent,/LIVE SOURCE FEED/);assert.equal(ui.$$('#news-grid .news-source-label').map(el=>el.textContent).filter(name=>name.includes('Nature')).length,1);
  assert.ok(ui.$$('.news-card time').every(el=>el.hasAttribute('datetime')));assert.match(ui.$('#news-updated').textContent,/UTC/);
  assert.equal(ui.$$('#timeline-live-items a').length,2);
});
await check('Loading more preserves previously visible cards',()=>{
  const first=ui.$$('.news-card h3').map(el=>el.textContent);ui.click('#news-more');assert.equal(ui.$$('.news-card').length,12);assert.deepEqual(ui.$$('.news-card h3').slice(0,6).map(el=>el.textContent),first);
});
await check('News source, category, search, sort, and empty-state reset controls work',()=>{
  ui.change('#news-source','arxiv');assert.ok(ui.$$('.news-card .publication-kind').every(el=>el.textContent==='Preprint'));
  ui.click('[data-news-category="ai"]');assert.ok(ui.$$('.news-card').length>0);assert.ok(ui.$$('.news-card .news-category').every(el=>el.textContent==='Quantum AI'));
  ui.input('#news-search','definitely-no-such-quantum-title');assert.equal(ui.$$('.news-card').length,0);assert.match(ui.$('#news-grid').textContent,/Try a wider view/);
  ui.click('[data-clear-news]');ui.change('#news-sort','oldest');const dates=ui.$$('.news-card time').map(el=>el.getAttribute('datetime'));assert.deepEqual(dates,[...dates].sort());ui.change('#news-sort','newest');
});
await check('Technology filters and research-area search select relevant companies',()=>{
  ui.click('[data-atlas-tech="ions"]');assert.deepEqual(new Set(ui.$$('.industry-card h3').map(el=>el.textContent)),new Set(['IonQ','Quantinuum']));
  ui.click('[data-atlas-tech="all"]');ui.input('#atlas-search','photonic');assert.ok(ui.$$('.industry-card').length>=2);
  ui.input('#atlas-search','impossible-company');assert.equal(ui.$$('.industry-card').length,0);ui.click('[data-clear-atlas]');assert.equal(ui.$$('.industry-card').length,10);
});
await check('Company profiles show technology, milestones, developments, and official links',()=>{
  for(const company of industry.companies){ui.click(`#company-${company.id} [data-company-profile]`);assert.equal(ui.$('#industry-dialog').open,true);assert.equal(ui.$('#industry-dialog-title').textContent,company.name);assert.match(ui.$('#industry-dialog-content').textContent,/SOURCED MILESTONE/);assert.match(ui.$('#industry-dialog-content').textContent,/DEVELOPMENTS & COVERAGE/);assert.ok(ui.$$('#industry-dialog-content a').every(el=>el.protocol==='https:'&&el.rel.includes('noopener')));ui.click('.industry-close');}
});
await check('Company coverage links filter the news and context clearing restores it',()=>{
  ui.click('#company-ibm [data-company-profile]');ui.click('[data-company-news="ibm"]');assert.equal(ui.$('#industry-dialog').open,false);assert.equal(ui.$('#news-context').hidden,false);assert.ok(ui.$$('.news-card').length>0);assert.ok(ui.$$('.news-card .company-mention').some(el=>el.textContent.includes('IBM')));ui.click('#clear-news-context');assert.equal(ui.$('#news-context').hidden,true);
});
await check('Company-to-application and timeline controls dispatch the integration events',()=>{
  let application,era;ui.document.addEventListener('quantum:application',event=>{application=event.detail.index;});ui.document.addEventListener('quantum:timeline',event=>{era=event.detail.era;});
  ui.click('#company-google [data-company-profile]');ui.click('#industry-dialog [data-frontier-app="2"]');assert.equal(application,2);assert.equal(ui.$('#industry-dialog').open,false);
  ui.click('#company-google [data-company-profile]');ui.click('#industry-dialog [data-frontier-timeline]');assert.equal(era,3);
  ui.$('#news-grid').insertAdjacentHTML('beforebegin','<button id="test-app-news" data-news-app="11">research</button><button id="test-app-atlas" data-atlas-app="11">industry</button>');
  ui.click('#test-app-news');assert.equal(ui.$('#news-context').hidden,false);ui.click('#test-app-atlas');assert.equal(ui.$('#atlas-context').hidden,false);assert.ok(ui.$$('.industry-card').length>0);ui.click('#clear-atlas-context');
});
await check('Automatic refresh uses a 15-minute interval and pauses when hidden or reading a dialog',async()=>{
  assert.equal(ui.intervalDelay,900000);ui.hide(true);const count=ui.apiCalls;ui.tick();assert.equal(ui.apiCalls,count);ui.hide(false);
  ui.click('#company-ibm [data-company-profile]');ui.tick();assert.equal(ui.apiCalls,count);ui.click('.industry-close');
  ui.$('#refresh-news').focus();ui.tick();await Promise.resolve();await Promise.resolve();assert.equal(ui.apiCalls,count+1);await ui.controller.refreshNews();
});
await check('Source failures turn existing coverage into an explicitly saved edition',async()=>{
  ui.fail(true);await ui.controller.refreshNews();assert.match(ui.$('#news-health').textContent,/SAVED EDITION/);assert.match(ui.$('#news-freshness').textContent,/saved edition/);assert.ok(ui.$$('#news-grid .saved-tag').length>0);assert.equal(ui.$('#refresh-news').disabled,false);ui.fail(false);await ui.controller.refreshNews();
});
await check('An individual outage stays visible alongside responding sources',async()=>{
  const partial=clone(snapshot);partial.mode='partial';partial.sources.find(source=>source.id==='nature').state='saved';partial.articles.filter(article=>article.sourceId==='nature').forEach(article=>{article.freshness='saved';});
  const other=setup({feed:partial});await other.controller.ready;assert.match(other.$('#news-health').textContent,/4 \/ 5/);other.click('[data-news-source="nature"]');assert.ok(other.$$('.saved-tag').length>0);other.close();
});
await check('The newest browser edition is retained if the network fails',async()=>{
  const cache=clone(snapshot);cache.checkedAt='2026-10-19T12:00:00Z';const other=setup({fail:true,initialCache:cache});await other.controller.ready;assert.match(other.$('#news-updated').textContent,/Oct 19, 2026/);assert.match(other.$('#news-health').textContent,/SAVED/);other.close();
});
await check('Publisher markup is displayed as text and unsafe source links are dropped',async()=>{
  const malicious=clone(snapshot);malicious.articles=[{...malicious.articles[0],title:'<img src=x onerror=alert(1)>',summary:'<script>alert(1)</script>',url:'https://arxiv.org/abs/2610.11111'},{...malicious.articles[0],url:'javascript:alert(1)'}];
  const other=setup({feed:malicious});await other.controller.ready;assert.equal(other.$$('.news-card').length,1);assert.equal(other.$$('#news-grid img,#news-grid script').length,0);assert.match(other.$('#news-grid').textContent,/<img/);other.close();
});
await check('No browser script errors occurred while exercising the new sections',()=>assert.deepEqual(ui.errors,[]));
ui.close();
console.log(`\n${passed} frontier interaction checks passed.`);
