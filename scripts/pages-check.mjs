import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { ALL_PAGES, PAGES, HOME_PAGE, SITE_URL, pageForPath, resolvePageUrl } from '../public/page-model.js';
import { initPages } from '../public/pages.js';
import { renderPageHtml } from '../lib/page-html.js';

const template = await readFile('public/index.html','utf8');
const pageStyles = await readFile('public/pages.css','utf8'), simulationStyles = await readFile('public/simulations.css','utf8');
let passed = 0;
async function check(name,fn) { await fn(); passed++; console.log(`✓ ${name}`); }
const flush = () => new Promise(resolve=>setTimeout(resolve,0));
function setup(url = SITE_URL + '/') {
  const errors = [], virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError',error=>errors.push(error));
  const dom = new JSDOM(template,{url,pretendToBeVisual:true,virtualConsole}), { window } = dom, { document } = window;
  const scrolls=[]; window.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this.id || this.tagName);}; window.scrollTo=options=>scrolls.push(options.top);
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const controller=initPages({document,window});
  const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
  const click=selector=>{const element=$(selector);assert.ok(element,selector);element.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));};
  return {$,$$,window,document,controller,scrolls,errors,click,cleanup(){controller.destroy();dom.window.close();}};
}

await check('Home and all eleven sections have unique clean URLs with safe path normalization',()=>{
  assert.equal(ALL_PAGES.length,12); assert.equal(new Set(ALL_PAGES.map(page=>page.path)).size,12);
  for(const page of ALL_PAGES) { assert.equal(pageForPath(page.path),page); if(page.path!=='/') { assert.equal(pageForPath(page.path+'/'),page); assert.equal(pageForPath(page.path+'.html'),page); } }
  assert.equal(pageForPath('/index.html'),HOME_PAGE); assert.equal(pageForPath('/not-a-page'),null);
});
await check('Every generated document contains just its visible page, a unique visible H1, and correct metadata',()=>{
  for(const page of ALL_PAGES) {
    const dom=new JSDOM(renderPageHtml(template,page)), doc=dom.window.document;
    const visibleSections=[...doc.querySelectorAll('[data-page-section]')].filter(section=>!section.hidden);
    assert.deepEqual(visibleSections.map(section=>section.dataset.pageSection),page.key==='home'?[]:[page.key]);
    assert.equal([...doc.querySelectorAll('h1')].filter(heading=>!heading.closest('[hidden]')).length,1);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,SITE_URL+page.path);
    assert.equal(doc.querySelector('meta[property="og:url"]').content,SITE_URL+page.path);
    assert.equal(doc.querySelector('meta[name="description"]').content,page.description);
    assert.ok(doc.title.includes(page.key==='home'?'QuantumApplicationsbyNJR':page.title));
    assert.equal(doc.querySelectorAll('#main-nav [aria-current="page"]').length,1);
    assert.equal(doc.querySelector('#page-context').hidden,page.key==='home');
    dom.window.close();
  }
});
await check('Page visibility overrides the laboratory’s existing important display rule',()=>{
  const dom=new JSDOM(renderPageHtml(template,PAGES.find(page=>page.key==='quantum-ai'))), doc=dom.window.document;
  const style=doc.createElement('style');style.textContent='[hidden]{display:none!important}'+simulationStyles+pageStyles;doc.head.append(style);
  assert.equal(dom.window.getComputedStyle(doc.querySelector('#quantum-lab')).display,'none');
  assert.notEqual(dom.window.getComputedStyle(doc.querySelector('#quantum-ai')).display,'none');dom.window.close();
});
await check('The home directory, shared navigation, breadcrumbs, and previous/next links cover every page',()=>{
  const app=setup();
  assert.equal(app.$$('#page-directory-grid a').length,11); assert.equal(app.$$('#main-nav a').length,12);
  for(const page of PAGES) assert.ok(app.$(`#page-directory-grid a[href="${page.path}"]`));
  app.controller.navigate('/quantum-ai'); assert.match(app.$('#page-context').textContent,/Home.*Quantum AI/);
  assert.equal(app.$('#page-continuation a').getAttribute('href'),'/lab'); assert.equal(app.$$('#page-continuation a')[1].getAttribute('href'),'/quantum-live'); app.cleanup();
});
await check('Old section links and nested anchors resolve to the appropriate independent page',()=>{
  const app=setup();
  for(const page of PAGES) assert.equal(resolvePageUrl('#'+page.section,SITE_URL+'/',app.document).href,page.path);
  assert.equal(resolvePageUrl('#quantum-ai-research',SITE_URL+'/',app.document).href,'/quantum-ai#quantum-ai-research');
  assert.equal(resolvePageUrl('https://example.org/quantum-ai',SITE_URL+'/',app.document),null);
  assert.equal(resolvePageUrl('/api/news',SITE_URL+'/',app.document),null);
  assert.equal(resolvePageUrl('#%xx',SITE_URL+'/',app.document),null); app.cleanup();
  const legacy=setup(SITE_URL+'/#quantum-ai'); assert.equal(legacy.window.location.pathname,'/quantum-ai'); assert.equal(legacy.window.location.hash,''); assert.equal(legacy.controller.current.key,'quantum-ai'); legacy.cleanup();
});
await check('Navigation changes the URL, active page, document title, and heading focus without duplicating history',()=>{
  const app=setup(); const length=app.window.history.length;
  app.click('#main-nav a[href="/quantum-ai"]'); assert.equal(app.window.location.pathname,'/quantum-ai');
  assert.equal(app.document.activeElement.id,'ai-title'); assert.equal(app.$('#ai-title').tagName,'H1'); assert.match(app.document.title,/Quantum AI/);
  assert.equal(app.$('.hero').hidden,true); assert.equal(app.$('#quantum-ai').hidden,false);
  assert.equal(app.window.history.length,length+1); app.click('#main-nav a[href="/quantum-ai"]'); assert.equal(app.window.history.length,length+1);
  app.click('#main-nav a[href="/lab"]'); assert.equal(app.$('#quantum-ai').hidden,true); assert.equal(app.$('#quantum-lab').hidden,false); assert.equal(app.$('#ai-title').tagName,'H2'); app.cleanup();
});
await check('Browser Back and Forward restore the matching page and close unrelated dialogs',async()=>{
  const app=setup(); app.controller.navigate('/quantum-ai'); app.controller.navigate('/lab');
  app.$('#application-dialog').open=true; app.window.history.back(); await flush(); await flush();
  assert.equal(app.window.location.pathname,'/quantum-ai'); assert.equal(app.$('#quantum-ai').hidden,false); assert.equal(app.$('#application-dialog').open,false);
  app.window.history.forward(); await flush(); await flush(); assert.equal(app.window.location.pathname,'/lab'); assert.equal(app.$('#quantum-lab').hidden,false); assert.ok(app.scrolls.includes(0)); app.cleanup();
});
await check('Cross-section controls reveal their destination before the existing click handler runs',()=>{
  const app=setup(); const cases=[['data-launch-sim','qubit','/lab'],['data-toolkit-detail','tool:qiskit','/toolkit'],['data-company-profile','ibm','/industry-atlas'],['data-research-detail','person:jay-gambetta','/people-projects'],['data-news-app','11','/quantum-live'],['data-frontier-timeline','','/evolution'],['data-universe-select','application:11','/universe']];
  for(const [attribute,value,path] of cases) {
    app.controller.navigate('/quantum-ai'); const button=app.document.createElement('button'); button.setAttribute(attribute,value); app.$('#quantum-ai').append(button);
    let seen;button.addEventListener('click',()=>{seen=app.window.location.pathname;});button.click();assert.equal(seen,path);button.remove();
  }
  app.cleanup();
});
await check('Cross-section integration events route before focus, graph, and timeline handlers run',()=>{
  const app=setup();
  for(const [event,path] of [['quantum:universe-select','/universe'],['quantum:story','/evolution'],['quantum:timeline','/evolution'],['quantum:concept','/fundamentals'],['quantum:application','/applications']]) {
    app.controller.navigate('/quantum-ai'); app.document.dispatchEvent(new app.window.CustomEvent(event,{detail:{}})); assert.equal(app.window.location.pathname,path);
  }
  app.cleanup();
});
await check('Dynamically inserted section links become shareable page links',async()=>{
  const app=setup(); const link=app.document.createElement('a');link.href='#industry-atlas';app.$('#quantum-ai').append(link);await flush();
  assert.equal(link.getAttribute('href'),'/industry-atlas'); app.cleanup();
});
await check('Native modified links, external pages, and downloads keep their normal browser behavior',()=>{
  const app=setup(); const anchor=app.$('#main-nav a[href="/quantum-ai"]');
  const modified=new app.window.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});anchor.dispatchEvent(modified);assert.equal(modified.defaultPrevented,false);assert.equal(app.window.location.pathname,'/');
  const download=app.$('a[download]'), event=new app.window.MouseEvent('click',{bubbles:true,cancelable:true});download.dispatchEvent(event);assert.equal(event.defaultPrevented,false);app.cleanup();
});
await check('Unchanged routes retain local interaction state and navigation clears a mobile menu',()=>{
  const app=setup(); app.controller.navigate('/lab');app.$('#theta').value='42';app.controller.navigate('/quantum-ai');app.controller.navigate('/lab');assert.equal(app.$('#theta').value,'42');
  app.$('.menu-button').setAttribute('aria-expanded','true');app.$('#main-nav').classList.add('open');app.controller.navigate('/learning');assert.equal(app.$('.menu-button').getAttribute('aria-expanded'),'false');assert.equal(app.$('#main-nav').classList.contains('open'),false);
  assert.deepEqual(app.errors,[]);app.cleanup();
});
console.log(`\n${passed} page routing checks passed.`);
