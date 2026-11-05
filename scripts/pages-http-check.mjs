import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ALL_PAGES, SITE_URL } from '../public/page-model.js';

const base = new URL(process.argv[2] || 'http://localhost:3000');
assert.ok(['http:','https:'].includes(base.protocol));
for (const page of ALL_PAGES) {
  const response = await fetch(new URL(page.path,base),{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,page.path); assert.match(response.headers.get('content-type'),/text\/html/);
  const dom = new JSDOM(await response.text()), document = dom.window.document;
  assert.equal(document.body.dataset.page,page.key);
  assert.equal(document.querySelector('link[rel="canonical"]').href,SITE_URL+page.path);
  assert.deepEqual([...document.querySelectorAll('[data-page-section]:not([hidden])')].map(element=>element.dataset.pageSection),page.key==='home'?[]:[page.key]);
  assert.equal(document.querySelectorAll('#main-nav [aria-current="page"]').length,1);
  dom.window.close(); console.log(`✓ Direct page request: ${page.path}`);
}
const missing=await fetch(new URL('/missing-quantum-page',base),{signal:AbortSignal.timeout(15000)});
assert.equal(missing.status,404); console.log('✓ Unknown routes return 404');
console.log(`Verified ${ALL_PAGES.length} direct page URLs at ${base.origin}.`);
