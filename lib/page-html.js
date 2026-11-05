import { JSDOM } from 'jsdom';
import { applyPageView } from '../public/page-model.js';

export function renderPageHtml(template,page) {
  const dom = new JSDOM(template);
  applyPageView(dom.window.document,page);
  const result = dom.serialize(); dom.window.close(); return result;
}
