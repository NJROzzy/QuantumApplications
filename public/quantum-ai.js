import { AI_PILLARS, selectAiNews } from './quantum-ai-model.js';
import { LAB_NAMES, safeExternalUrl } from './frontier-model.js';

export function initQuantumAI({ document, window, frontier }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Date not supplied';
  const external = (url, label, className = 'text-link') => { const safe = safeExternalUrl(url); return safe ? `<a class="${className}" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : ''; };
  const toolNames = { qiskit: 'Qiskit', cirq: 'Cirq', qdk: 'Microsoft QDK', cudaq: 'CUDA-Q', pennylane: 'PennyLane', stim: 'Stim' };
  const requestedPillar = new window.URLSearchParams(window.location.search).get('pillar');
  const initialPillar = AI_PILLARS.some(item => item.id === requestedPillar) ? requestedPillar : 'tech';
  const state = { content: null, pillar: initialPillar, step: 0, feed: null, busy: false, attempted: false, newsPillar: requestedPillar === initialPillar ? initialPillar : 'all', source: 'all', query: '', visible: 3 };
  let disposed = false;
  const abort = new window.AbortController();

  function renderWorkflow() {
    const pillar = state.content?.pillars.find(item => item.id === state.pillar); if (!pillar) return;
    $$('#ai-workflow-steps [role="tab"]').forEach((button, index) => { button.setAttribute('aria-selected', String(index === state.step)); button.tabIndex = index === state.step ? 0 : -1; });
    const step = pillar.workflow[state.step];
    $('#ai-workflow-detail').setAttribute('aria-labelledby', `ai-workflow-step-${state.step}`);
    $('#ai-workflow-detail').innerHTML = `<span class="mono">STEP ${state.step + 1} / ${pillar.workflow.length}</span><h4>${escape(step.title)}</h4><p>${escape(step.text)}</p>`;
  }
  function syncNotesToggle() {
    const notes = $$('#ai-technical-notes details'), expanded = notes.length > 0 && notes.every(note => note.open);
    const button = $('#ai-notes-toggle'); if (!button) return;
    button.setAttribute('aria-expanded', String(expanded)); button.textContent = expanded ? 'Collapse technical notes ↑' : 'Expand all technical notes ↓';
  }
  function renderPillar() {
    $$('#ai-pillar-tabs [role="tab"]').forEach(button => { const active = button.dataset.aiPillar === state.pillar; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    $('#ai-pillar-panel').setAttribute('aria-labelledby', `ai-pillar-${state.pillar}`);
    if (!state.content) return;
    const item = state.content.pillars.find(pillar => pillar.id === state.pillar), meta = AI_PILLARS.find(pillar => pillar.id === item.id), index = AI_PILLARS.indexOf(meta);
    const reference = id => external(item.resources[id]?.url, `Source ${id + 1} ↗`);
    const briefUrl = anchor => `/quantum-ai?pillar=${item.id}#${anchor}`;
    $('#ai-pillar-panel').style.setProperty('--pillar-color', meta.color);
    $('#ai-pillar-panel').innerHTML = `
      <header class="ai-brief-header"><div class="ai-brief-meta"><span class="mono">PILLAR ${String(index + 1).padStart(2,'0')} / TECHNICAL BRIEF</span><span>${escape(item.level)}</span></div><h3>${escape(item.headline)}</h3><p class="ai-brief-summary">${escape(item.summary)}</p><div class="ai-research-question"><span class="mono">THE ENGINEERING QUESTION</span><p>${escape(item.question)}</p></div><div class="ai-prerequisite-heading">ASSUMED BACKGROUND</div><ul class="ai-prerequisites">${item.prerequisites.map(value => `<li>${escape(value)}</li>`).join('')}</ul></header>
      <nav class="ai-brief-contents" aria-label="Sections in this technical brief"><a href="${briefUrl('ai-notes')}">Technical notes</a><a href="${briefUrl('ai-working-model')}">Working model</a><a href="${briefUrl('ai-workflow')}">Workflow</a><a href="${briefUrl('ai-project')}">Project brief</a><a href="${briefUrl('ai-evaluation')}">Evaluation</a><a href="${briefUrl('ai-sources')}">Sources</a></nav>
      <section class="ai-brief-section" id="ai-notes" aria-labelledby="ai-notes-title"><div class="ai-subsection-heading"><div><span class="mono">01 / THEORY & METHODS</span><h4 id="ai-notes-title">Technical notes</h4></div><button class="text-link" id="ai-notes-toggle" data-ai-notes-toggle aria-controls="ai-technical-notes" aria-expanded="false">Expand all technical notes ↓</button></div><div class="ai-technical-notes" id="ai-technical-notes">${item.topics.map((topic, topicIndex) => `<details ${topicIndex === 0 ? 'open' : ''}><summary><span class="ai-note-index">${String(topicIndex + 1).padStart(2,'0')}</span><strong>${escape(topic.title)}</strong></summary><div class="ai-note-copy"><p>${escape(topic.text)}</p><p>${escape(topic.detail)}</p><div class="ai-inline-sources">${topic.sources.map(reference).join('')}</div></div></details>`).join('')}</div></section>
      <section class="ai-working-model" id="ai-working-model" aria-labelledby="ai-model-title"><div><span class="mono">WORKING MODEL / ASSUMPTIONS MATTER</span><h4 id="ai-model-title">${escape(item.model.title)}</h4></div><div class="ai-equation" role="math" aria-label="${escape(item.model.title + ": " + item.model.expression)}">${escape(item.model.expression)}</div><p>${escape(item.model.assumptions)}</p>${reference(item.model.source)}</section>
      <section class="ai-brief-section ai-workflow" id="ai-workflow" aria-labelledby="ai-workflow-title"><div class="ai-subsection-heading"><div><span class="mono">02 / EXECUTION PATH</span><h4 id="ai-workflow-title">Build a defensible workflow</h4></div></div><p class="ai-workflow-hint">Select a stage to inspect its requirements.</p><div id="ai-workflow-steps" class="ai-workflow-steps" role="tablist" aria-label="${escape(item.title)} workflow">${item.workflow.map((step, stepIndex) => `<button id="ai-workflow-step-${stepIndex}" data-ai-step="${stepIndex}" role="tab" aria-label="Step ${stepIndex + 1}: ${escape(step.title)}" aria-controls="ai-workflow-detail" aria-selected="${stepIndex === state.step}" tabindex="${stepIndex === state.step ? 0 : -1}"><span>${String(stepIndex + 1).padStart(2,'0')}</span>${escape(step.title)}</button>`).join('')}</div><div id="ai-workflow-detail" role="tabpanel" aria-live="polite"></div><p class="ai-workflow-note">Use the on-site lab for related physics; implement this workflow in the linked external tools.</p></section>
      <section class="ai-brief-section" id="ai-project" aria-labelledby="ai-project-title"><div class="ai-subsection-heading"><div><span class="mono">03 / REPRODUCIBLE RESEARCH</span><h4 id="ai-project-title">Project brief</h4></div><span class="ai-execution-label">EXTERNAL SDK / NOTEBOOK</span></div><article class="ai-project-card"><h5>${escape(item.project.title)}</h5><p>${escape(item.project.objective)}</p><ol>${item.project.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol><div class="ai-project-deliverables"><span class="mono">DELIVERABLES</span><ul>${item.project.deliverables.map(value => `<li>${escape(value)}</li>`).join('')}</ul></div><div class="ai-project-baseline"><strong>Comparison & scope</strong><p>${escape(item.project.baseline)}</p></div></article><div class="ai-lab-bridge"><div><span class="mono">RELATED PHYSICS</span><p>${escape(item.starter.text)}</p></div><button class="button secondary" data-launch-sim="${escape(item.starter.lab)}">Open ${escape(LAB_NAMES[item.starter.lab])} ↗</button></div><div class="ai-tool-links"><span class="mono">SOFTWARE & IMPLEMENTATION</span>${item.tools.map(id => `<button class="text-link" data-toolkit-detail="tool:${escape(id)}">${escape(toolNames[id] || id)} ↗</button>`).join('')}<button class="text-link" data-toolkit-detail="technique:${escape(item.technique)}">Explore the related technique ↗</button></div></section>
      <section class="ai-brief-section" id="ai-evaluation" aria-labelledby="ai-evaluation-title"><div class="ai-subsection-heading"><div><span class="mono">04 / MEASUREMENT & EVIDENCE</span><h4 id="ai-evaluation-title">What to report</h4></div></div><div class="ai-evaluation-scroll" role="region" tabindex="0" aria-label="Evaluation metrics and limitations"><table class="ai-evaluation-table"><thead><tr><th scope="col">Dimension</th><th scope="col">Measure or document</th><th scope="col">Interpretation limit</th></tr></thead><tbody>${item.evaluation.map(row => `<tr><th scope="row">${escape(row.metric)}</th><td>${escape(row.method)}</td><td>${escape(row.limit)}</td></tr>`).join('')}</tbody></table></div><div class="ai-perspective"><span aria-hidden="true">↳</span><p>${escape(item.perspective)}</p></div></section>
      <section class="ai-brief-section" id="ai-sources" aria-labelledby="ai-sources-title"><div class="ai-subsection-heading"><div><span class="mono">05 / PRIMARY REFERENCES</span><h4 id="ai-sources-title">Read the original work</h4></div></div><div class="ai-resources">${item.resources.map((resource, resourceIndex) => `<div><span class="mono">[${resourceIndex + 1}] ${escape(resource.kind)}</span>${external(resource.url, resource.title + ' ↗')}</div>`).join('')}</div><div class="ai-panel-links"><button class="text-link" data-chapter="${item.chapter}">Read the related guide chapter ↗</button><button class="text-link" data-universe-select="${escape(item.universe)}">Explore this pillar in the universe ↗</button><a class="text-link" href="${briefUrl('quantum-ai-research')}">Related research updates ↓</a><a class="text-link" href="${briefUrl('ai-workspace')}">Choose another pillar ↑</a></div></section>`;
    renderWorkflow(); syncNotesToggle();
  }
  function renderNewsFilters() {
    $('#ai-news-pillars').innerHTML = [{ id: 'all', title: 'All four pillars' }, ...AI_PILLARS].map(item => `<button data-ai-news-pillar="${item.id}" aria-pressed="${item.id === state.newsPillar}" class="${item.id === state.newsPillar ? 'active' : ''}">${item.title}</button>`).join('');
  }
  function renderNews(preserveCards = false) {
    $('#ai-news-refresh').disabled = state.busy;
    $('#ai-news-refresh').textContent = state.busy ? 'Checking sources…' : 'Refresh research ↻';
    $('#quantum-ai-news-grid').setAttribute('aria-busy', String(state.busy || (!state.feed && !state.attempted)));
    if (!state.feed) {
      $('#ai-news-health').textContent = state.attempted && !state.busy ? 'SOURCES UNAVAILABLE' : 'CHECKING SOURCES';
      $('#ai-news-count').textContent = state.attempted && !state.busy ? 'No edition available' : 'Connecting to the research feed…';
      if (state.attempted && !state.busy) $('#quantum-ai-news-grid').innerHTML = '<p class="frontier-empty">Research sources are temporarily unavailable. Use Refresh research to retry, or explore the official learning resources above.</p>';
      return;
    }
    const live = state.feed.sources.filter(source => source.state === 'live').length;
    $('#ai-news-health').textContent = live ? `${live} / 5 SOURCES RESPONDING` : 'SAVED EDITION'; $('#ai-news-health').dataset.state = live ? 'live' : 'saved';
    const checkedAt = state.feed.checkedAt, parsed = new Date(checkedAt);
    $('#ai-news-updated').textContent = checkedAt && Number.isFinite(parsed.getTime()) ? `Checked ${date(checkedAt)} · ${new Intl.DateTimeFormat('en-US', { timeStyle: 'short', hour12: false, timeZone: 'UTC' }).format(parsed)} UTC` : 'Check time unavailable';
    $('#ai-news-updated').title = checkedAt || 'Check time unavailable';
    $('#ai-news-freshness').textContent = live === 5 ? 'Automatic checks every 15 minutes while this page is open. New coverage follows publisher schedules; original publication dates are preserved.' : live ? 'Some sources are unavailable. Saved articles are marked and keep their original dates. Automatic checks continue every 15 minutes.' : 'Live sources are unavailable. This saved edition keeps its original publication dates; automatic checks will retry.';
    if (preserveCards) return;
    const matching = selectAiNews(state.feed, { pillar: state.newsPillar, source: state.source, query: state.query }), visible = matching.slice(0, state.visible);
    const label = AI_PILLARS.find(item => item.id === state.newsPillar)?.title || 'all four pillars';
    $('#ai-news-count').textContent = `${visible.length} of ${matching.length} developments · ${label}`;
    $('#quantum-ai-news-grid').innerHTML = visible.length ? visible.map(article => `<article class="ai-news-card"><div class="ai-news-meta"><span>${escape(article.sourceName)}</span><time${Number.isFinite(Date.parse(article.publishedAt)) ? ` datetime="${escape(article.publishedAt)}"` : ''}>${date(article.publishedAt)}</time></div><div class="ai-news-tags"><span>${escape(article.kind)}</span>${article.freshness === 'saved' ? '<span class="saved-tag">SAVED</span>' : ''}</div><h4>${external(article.url, article.title, '')}</h4><p>${escape(article.summary)}</p><span class="ai-summary-caption">${escape(article.summaryType || 'Source excerpt')}</span><div class="ai-news-topics">${article.aiPillars.map(id => `<span>${AI_PILLARS.find(item => item.id === id).title}</span>`).join('')}</div><div class="ai-news-links">${external(article.url, 'Original source ↗')}${LAB_NAMES[article.lab] ? `<button class="text-link" data-launch-sim="${article.lab}">Explore a related lab ↗</button>` : ''}</div></article>`).join('') : `<div class="frontier-empty"><span class="mono">NO MATCHING COVERAGE</span><h4>No matching developments in this edition.</h4><p>Coverage depends on what the publishers release. Explore all four pillars or change your search and source.</p><button class="button secondary" data-ai-news-reset>Show all pillar news ↺</button></div>`;
    $('#ai-news-more').hidden = visible.length >= matching.length;
  }
  function selectPillar(id, { updateUrl = true } = {}) {
    if (!AI_PILLARS.some(item => item.id === id)) return;
    state.pillar = id; state.step = 0; state.newsPillar = id; state.visible = 3;
    if (updateUrl && window.location.pathname === '/quantum-ai') { const url = new window.URL(window.location.href); url.searchParams.set('pillar', id); window.history.replaceState(window.history.state, '', url.href); }
    renderPillar(); renderNewsFilters(); renderNews();
  }
  function onClick(event) {
    const button = event.target.closest('#quantum-ai button'); if (!button || disposed) return;
    if (button.hasAttribute('data-ai-pillar')) selectPillar(button.dataset.aiPillar);
    if (button.hasAttribute('data-ai-notes-toggle')) { const notes = $$('#ai-technical-notes details'), expand = notes.some(note => !note.open); notes.forEach(note => { note.open = expand; }); syncNotesToggle(); }
    if (button.hasAttribute('data-ai-step') && state.content) { const step = Number(button.dataset.aiStep); if (Number.isInteger(step) && step >= 0 && step < 4) { state.step = step; renderWorkflow(); } }
    if (button.hasAttribute('data-ai-news-pillar')) { state.newsPillar = button.dataset.aiNewsPillar; state.visible = 3; renderNewsFilters(); renderNews(); $(`#ai-news-pillars [data-ai-news-pillar="${state.newsPillar}"]`)?.focus({ preventScroll: true }); }
    if (button.hasAttribute('data-ai-news-reset')) { state.newsPillar = 'all'; state.source = 'all'; state.query = ''; state.visible = 3; $('#ai-news-search').value = ''; $('#ai-news-source').value = 'all'; renderNewsFilters(); renderNews(); $('#ai-news-search').focus({ preventScroll: true }); }
  }
  function tabKeys(event, selector, activate) {
    const buttons = $$(selector), index = buttons.indexOf(document.activeElement); if (index < 0) return;
    let next;
    if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
    else if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); activate(next); $$(selector)[next]?.focus({ preventScroll: true }); }
  }
  function onLocation() { if (window.location.pathname !== '/quantum-ai') return; const id = new window.URLSearchParams(window.location.search).get('pillar'); if (id && id !== state.pillar && AI_PILLARS.some(item => item.id === id)) selectPillar(id, { updateUrl: false }); }
  document.addEventListener('click', onClick); document.addEventListener('quantum:page-change', onLocation); window.addEventListener('popstate', onLocation);
  $('#ai-pillar-tabs').addEventListener('keydown', event => tabKeys(event, '#ai-pillar-tabs [role="tab"]', index => selectPillar(AI_PILLARS[index].id)));
  $('#ai-pillar-panel').addEventListener('toggle', syncNotesToggle, true);
  $('#ai-pillar-panel').addEventListener('keydown', event => tabKeys(event, '#ai-workflow-steps [role="tab"]', index => { state.step = index; renderWorkflow(); }));
  $('#ai-news-search').addEventListener('input', () => { state.query = $('#ai-news-search').value.trim(); state.visible = 3; renderNews(); });
  $('#ai-news-source').addEventListener('change', () => { state.source = $('#ai-news-source').value; state.visible = 3; renderNews(); });
  $('#ai-news-refresh').addEventListener('click', () => frontier.refreshNews());
  $('#ai-news-more').addEventListener('click', () => { const previous = state.visible; state.visible += 3; renderNews(); $$('#quantum-ai-news-grid h4 a')[previous]?.focus({ preventScroll: true }); });
  renderNewsFilters();
  const unsubscribe = frontier.subscribeNews(update => { const preserve = update.busy && state.feed === update.feed; Object.assign(state, update); if (!disposed) renderNews(preserve); });
  const timeout = window.setTimeout(() => abort.abort(), 10000);
  const ready = (async () => {
    try {
      const response = await window.fetch('/content/quantum-ai.json', { signal: abort.signal }); if (!response.ok) throw new Error('Pillars unavailable');
      const content = await response.json(); if (!AI_PILLARS.every(meta => content.pillars?.some(item => item.id === meta.id && item.workflow?.length === 4 && item.model?.expression && item.project?.steps?.length === 4 && item.evaluation?.length === 4))) throw new Error('Invalid pillars');
      if (disposed) return null;
      state.content = content; renderPillar(); $('#ai-content-reviewed').textContent = `Technical content reviewed ${date(content.reviewedAt)} · ${content.pillars.reduce((sum, item) => sum + item.resources.length, 0)} primary references`; return content;
    } catch {
      if (!disposed) $('#ai-pillar-panel').innerHTML = '<p class="frontier-empty">The learning pillars could not load. Reload the page to retry, or explore the toolkit and complete guide. Research news remains available below.</p>';
      return null;
    } finally { window.clearTimeout(timeout); $('#ai-pillar-panel').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; unsubscribe(); abort.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick); document.removeEventListener('quantum:page-change', onLocation); window.removeEventListener('popstate', onLocation); } };
}
