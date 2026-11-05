import { HOME_PAGE, PAGES, applyPageView, pageForElement, resolvePageUrl, rewritePageLinks } from './page-model.js';

export function initPages({ document, window }) {
  let current = null, pendingHash = '', disposed = false;
  const $ = selector => document.querySelector(selector);
  const bySection = id => PAGES.find(page => page.section === id);
  function closeMenu() { const button = $('.menu-button'); button?.setAttribute('aria-expanded','false'); button?.setAttribute('aria-label','Open navigation'); $('#main-nav')?.classList.remove('open'); }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
  function focusTarget(element) { if (!element) return; if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex','-1'); element.focus({preventScroll:true}); }
  function anchorTarget() { try { return document.getElementById(decodeURIComponent(pendingHash.slice(1))); } catch { return null; } }
  function revealAnchor(focus = true) {
    if (!pendingHash) return false;
    const target = anchorTarget(); if (!target || target.closest('[hidden]')) return false;
    if (current.key === 'quantum-ai' && $('#ai-pillar-panel')?.getAttribute('aria-busy') === 'true') return false;
    pendingHash = ''; target.scrollIntoView({behavior:'instant',block:'start'}); if (focus) focusTarget(target); return true;
  }
  function show(resolved, { focus = true, restore = null, initial = false } = {}) {
    const previous = current; current = resolved.page; pendingHash = resolved.hash;
    if (previous?.key !== current.key) closeDialogs();
    applyPageView(document,current); closeMenu();
    document.dispatchEvent(new window.CustomEvent('quantum:page-change',{detail:{page:current.key,previous:previous?.key || null}}));
    const heading = current.key === 'home' ? $('#hero-title') : document.getElementById(document.getElementById(current.section)?.getAttribute('aria-labelledby'));
    if (restore !== null) window.scrollTo({top:restore,behavior:'instant'});
    else if (!revealAnchor(focus) && !initial) $('main').scrollIntoView({behavior:'instant',block:'start'});
    if (focus && !resolved.hash) focusTarget(heading);
    $('.reading-progress').style.width = '0%';
  }
  function navigate(href, { replace = false, focus = true } = {}) {
    const resolved = resolvePageUrl(href,window.location.href,document); if (!resolved) return false;
    const next = new window.URL(resolved.href,window.location.origin);
    const changed = next.href !== window.location.href;
    if (changed) {
      window.history.replaceState({...window.history.state,scrollY:window.scrollY},'',window.location.href);
      window.history[replace ? 'replaceState' : 'pushState']({quantumPage:resolved.page.key,scrollY:0},'',resolved.href);
    }
    // Same-page controls should keep the visitor's place and any open detail dialog.
    if (changed || current?.key !== resolved.page.key || focus) show(resolved,{focus});
    return true;
  }
  const actions = [
    ['data-launch-sim','quantum-lab'],['data-toolkit-detail','quantum-toolkit'],['data-toolkit-app','quantum-toolkit'],['data-toolkit-company','quantum-toolkit'],
    ['data-company-profile','industry-atlas'],['data-atlas-app','industry-atlas'],['data-company-news','quantum-live'],['data-news-app','quantum-live'],
    ['data-research-detail','quantum-innovators'],['data-innovators-company','quantum-innovators'],['data-innovators-app','quantum-innovators'],
    ['data-frontier-app','applications'],['data-toolkit-application','applications'],['data-research-application','applications'],
    ['data-frontier-timeline','evolution'],['data-milestone','evolution'],['data-universe-event','evolution'],['data-universe-story','evolution'],
    ['data-universe-select','quantum-universe'],['data-evolution-universe','quantum-universe'],['data-story-universe','quantum-universe'],
    ['data-universe-concept','foundations'],['data-universe-app','applications'],
  ];
  function onClick(event) {
    if (disposed || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href]');
    if (anchor && !anchor.hasAttribute('download') && (!anchor.target || anchor.target === '_self')) {
      if (resolvePageUrl(anchor.href,window.location.href,document)) { event.preventDefault(); navigate(anchor.href); } return;
    }
    const control = event.target.closest('button,[role="button"]'); if (!control) return;
    const action = actions.find(([attribute]) => control.hasAttribute(attribute));
    const page = action ? bySection(action[1]) : pageForElement(control);
    if (page && page.key !== current?.key) navigate(page.path,{focus:true});
  }
  function routeEvent(section) { return () => { const page = bySection(section); if (page && page.key !== current?.key) navigate(page.path,{focus:false}); }; }
  const events = {
    'quantum:universe-select':routeEvent('quantum-universe'),'quantum:universe-route':routeEvent('quantum-universe'),
    'quantum:timeline':routeEvent('evolution'),'quantum:milestone':routeEvent('evolution'),'quantum:story':routeEvent('evolution'),
    'quantum:concept':routeEvent('foundations'),'quantum:application':routeEvent('applications'),
  };
  function onPopState(event) { const resolved = resolvePageUrl(window.location.href,window.location.href,document); if (resolved) { closeDialogs(); show(resolved,{focus:true,restore:event.state?.scrollY ?? 0}); } }
  function onHashChange() { navigate(window.location.href,{replace:true}); }
  document.addEventListener('click',onClick,true);
  for (const [name,listener] of Object.entries(events)) document.addEventListener(name,listener);
  window.addEventListener('popstate',onPopState); window.addEventListener('hashchange',onHashChange);
  window.history.scrollRestoration = 'manual';
  const initial = resolvePageUrl(window.location.href,window.location.href,document) || {page:HOME_PAGE,href:'/',hash:''};
  window.history.replaceState({quantumPage:initial.page.key,scrollY:0},'',initial.href);
  show(initial,{focus:false,initial:true});
  const observer = new window.MutationObserver(records => {
    if (disposed) return;
    for (const record of records) for (const added of record.addedNodes) if (added.nodeType === 1) rewritePageLinks(document,added);
    revealAnchor(false);
  });
  observer.observe($('main'),{childList:true,subtree:true});
  return { navigate, get current() { return current; }, destroy() { disposed = true; observer.disconnect(); document.removeEventListener('click',onClick,true); for (const [name,listener] of Object.entries(events)) document.removeEventListener(name,listener); window.removeEventListener('popstate',onPopState); window.removeEventListener('hashchange',onHashChange); } };
}
