export const SITE_URL = 'https://quantumapplicationsbynjr.vercel.app';
export const HOME_PAGE = { key: 'home', path: '/', title: 'Home', description: 'Explore quantum science through connected pages, interactive experiments, research, people, and technology.' };
export const PAGES = [
  { key: 'universe', path: '/universe', section: 'quantum-universe', title: 'Quantum Universe', description: 'Explore the connections between quantum principles, applications, tools, pioneers, companies, and current projects.', tag: 'FOLLOW THE CONNECTIONS' },
  { key: 'fundamentals', path: '/fundamentals', section: 'foundations', title: 'Fundamentals', description: 'Build your understanding of superposition, entanglement, interference, quantization, uncertainty, noise, tunneling, and spin.', tag: 'START WITH THE PRINCIPLES' },
  { key: 'applications', path: '/applications', section: 'applications', title: 'Applications', description: 'Discover fifteen quantum application areas, from established technologies to emerging systems and research.', tag: 'FROM SCIENCE TO USE' },
  { key: 'evolution', path: '/evolution', section: 'evolution', title: 'Quantum Evolution', description: 'Follow the quantum story through six chapters, twenty-seven sourced milestones, and the people who shaped the field.', tag: 'TRACE THE STORY' },
  { key: 'lab', path: '/lab', section: 'quantum-lab', title: 'Interactive Lab', description: 'Experiment with quantum states, gates, interference, entangled pairs, and tunneling in four educational simulations.', tag: 'MAKE AN EXPERIMENT' },
  { key: 'quantum-ai', path: '/quantum-ai', section: 'quantum-ai', title: 'Quantum AI', description: 'Advanced briefs on Quantum Technology, Quantum Programming, Quantum Machine Learning, and Advanced Quantum AI, with technical models, reproducible projects, and live research.', tag: 'EXPLORE FOUR PILLARS' },
  { key: 'news', path: '/quantum-live', section: 'quantum-live', title: 'Quantum Live', description: 'Follow quantum research from arXiv, IBM Quantum, Google Quantum AI, MIT, and Nature, with original dates and sources.', tag: 'FOLLOW THE FRONTIER' },
  { key: 'industry', path: '/industry-atlas', section: 'industry-atlas', title: 'Industry Atlas', description: 'Meet ten companies advancing quantum hardware and software through source-linked technology profiles and research.', tag: 'MEET THE BUILDERS' },
  { key: 'people', path: '/people-projects', section: 'quantum-innovators', title: 'People & Projects', description: 'Discover the researchers, teams, laboratories, and current programs advancing quantum technology.', tag: 'MEET THE MINDS' },
  { key: 'toolkit', path: '/toolkit', section: 'quantum-toolkit', title: 'Quantum Toolkit', description: 'Compare quantum software platforms, explore twelve techniques, and follow official documentation and learning paths.', tag: 'CHOOSE YOUR TOOLS' },
  { key: 'learning', path: '/learning', section: 'learning', title: 'Learning Paths', description: 'Choose a quantum learning roadmap, find a hands-on project, and explore the complete nineteen-chapter field guide.', tag: 'TAKE THE NEXT STEP' },
];
export const ALL_PAGES = [HOME_PAGE, ...PAGES];
export function pageForPath(path) { const clean = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/'; return ALL_PAGES.find(page => page.path === clean) || null; }
export function pageForElement(element) {
  const section = element?.closest?.('main > section[id]');
  return PAGES.find(page => page.section === section?.id) || (element?.closest?.('[data-home-only]') ? HOME_PAGE : null);
}
export function resolvePageUrl(href, base, document) {
  let url; try { url = new URL(href, base); } catch { return null; }
  if (url.origin !== new URL(base).origin) return null;
  let page = pageForPath(url.pathname); if (!page) return null;
  if (url.hash) {
    let id; try { id = decodeURIComponent(url.hash.slice(1)); } catch { return null; }
    const target = document.getElementById(id), targetPage = pageForElement(target) || PAGES.find(item => item.section === id);
    if (targetPage) page = targetPage;
    if (id === page.section) url.hash = '';
  }
  return { page, href: page.path + url.search + url.hash, hash: url.hash };
}
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function headingTag(element, tag) {
  if (!element || element.tagName.toLowerCase() === tag) return;
  const next = element.ownerDocument.createElement(tag);
  for (const attribute of element.attributes) next.setAttribute(attribute.name, attribute.value);
  while (element.firstChild) next.append(element.firstChild);
  element.replaceWith(next);
}
export function rewritePageLinks(document, root = document) {
  const links = [...(root.matches?.('a[href]') ? [root] : []), ...root.querySelectorAll('a[href]')];
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href.startsWith('#')) continue;
    const resolved = resolvePageUrl(href, SITE_URL + '/', document);
    if (resolved && href !== resolved.href) link.setAttribute('href', resolved.href);
  }
}
export function applyPageView(document, page) {
  document.body.dataset.page = page.key;
  for (const item of PAGES) {
    const section = document.getElementById(item.section); if (!section) continue;
    section.dataset.pageSection = item.key; section.hidden = item.key !== page.key;
    const heading = document.getElementById(section.getAttribute('aria-labelledby'));
    headingTag(heading, item.key === page.key ? 'h1' : 'h2');
  }
  document.querySelectorAll('[data-home-only]').forEach(element => { element.hidden = page.key !== 'home'; });
  const title = page.key === 'home' ? 'QuantumApplicationsbyNJR — Explore the quantum world' : `${page.title} — QuantumApplicationsbyNJR`;
  document.title = title;
  for (const [selector, value] of [['meta[name="description"]',page.description],['meta[property="og:title"]',title],['meta[property="og:description"]',page.description]]) document.querySelector(selector)?.setAttribute('content',value);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = SITE_URL + page.path;
  let socialUrl = document.querySelector('meta[property="og:url"]');
  if (!socialUrl) { socialUrl = document.createElement('meta'); socialUrl.setAttribute('property','og:url'); document.head.append(socialUrl); }
  socialUrl.content = SITE_URL + page.path;
  const nav = document.querySelector('#main-nav');
  if (nav && !nav.querySelector('[data-home-nav]')) nav.insertAdjacentHTML('afterbegin','<a href="/" data-home-nav>Home</a>');
  if (nav && !nav.querySelector('[data-learning-nav]')) nav.insertAdjacentHTML('beforeend','<a href="/learning" data-learning-nav>Learning</a>');
  rewritePageLinks(document);
  nav?.querySelectorAll('a').forEach(link => { const active = pageForPath(new URL(link.getAttribute('href'),SITE_URL).pathname)?.key === page.key; link.classList.toggle('current',active); if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  const skip = document.querySelector('.skip-link'); if (skip) skip.href = page.key === 'home' ? '/#explore-pages' : page.path;
  const context = document.querySelector('#page-context');
  if (context) { context.hidden = page.key === 'home'; context.innerHTML = `<nav aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${escape(page.title)}</span></nav><a class="text-link" href="/#explore-pages">Explore all pages ↗</a>`; }
  const directory = document.querySelector('#page-directory-grid');
  if (directory && !directory.childElementCount) directory.innerHTML = PAGES.map((item,index) => `<a class="page-directory-card" href="${item.path}"><span class="mono">${String(index+1).padStart(2,'0')} / ${item.tag}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><span class="page-card-bottom">Explore the page <span aria-hidden="true">↗</span></span></a>`).join('');
  const continuation = document.querySelector('#page-continuation');
  if (continuation) {
    continuation.hidden = page.key === 'home'; const index = PAGES.indexOf(page), previous = PAGES[index-1] || HOME_PAGE, next = PAGES[index+1] || HOME_PAGE;
    continuation.innerHTML = `<a href="${previous.path}"><span class="mono">← PREVIOUS PAGE</span><strong>${escape(previous.title)}</strong></a><a href="${next.path}"><span class="mono">NEXT PAGE →</span><strong>${escape(next.title)}</strong></a>`;
  }
}
