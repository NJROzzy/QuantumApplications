import { AI_PILLARS, selectAiNews } from './quantum-ai-model.js';
import { LAB_NAMES, safeExternalUrl } from './frontier-model.js';

export function initQuantumAI({ document, window, frontier }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Date not supplied';
  const external = (url, label, className = 'text-link') => { const safe = safeExternalUrl(url); return safe ? `<a class="${className}" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : ''; };
  const toolNames = { qiskit: 'Qiskit', cirq: 'Cirq', qdk: 'Microsoft QDK', cudaq: 'CUDA-Q', pennylane: 'PennyLane', stim: 'Stim' };
  const state = { content: null, pillar: 'tech', step: 0, feed: null, busy: false, attempted: false, newsPillar: 'all', source: 'all', query: '', visible: 3 };
  let disposed = false;
  const abort = new window.AbortController();

  function renderWorkflow() {
    const pillar = state.content?.pillars.find(item => item.id === state.pillar); if (!pillar) return;
    $$('#ai-workflow-steps [role="tab"]').forEach((button, index) => { button.setAttribute('aria-selected', String(index === state.step)); button.tabIndex = index === state.step ? 0 : -1; });
    const step = pillar.workflow[state.step];
    $('#ai-workflow-detail').setAttribute('aria-labelledby', `ai-workflow-step-${state.step}`);
    $('#ai-workflow-detail').innerHTML = `<span class="mono">STEP ${state.step + 1} / ${pillar.workflow.length}</span><h4>${escape(step.title)}</h4><p>${escape(step.text)}</p>`;
  }
  function renderPillar() {
    $$('#ai-pillar-tabs [role="tab"]').forEach(button => { const active = button.dataset.aiPillar === state.pillar; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    $('#ai-pillar-panel').setAttribute('aria-labelledby', `ai-pillar-${state.pillar}`);
    if (!state.content) return;
    const item = state.content.pillars.find(pillar => pillar.id === state.pillar), meta = AI_PILLARS.find(pillar => pillar.id === item.id);
    $('#ai-pillar-panel').style.setProperty('--pillar-color', meta.color);
    $('#ai-pillar-panel').innerHTML = `<div class="ai-pillar-intro"><div><span class="eyebrow">${escape(item.level)}</span><h3>${escape(item.headline)}</h3><p>${escape(item.summary)}</p></div><div class="ai-direction"><span class="mono">${escape(item.tagline)}</span><span class="ai-orbit-mark" aria-hidden="true">${['⟡','{ ψ }','∇θ','∞'][AI_PILLARS.indexOf(meta)]}</span><span class="mono">PILLAR ${String(AI_PILLARS.indexOf(meta) + 1).padStart(2, '0')} / 04</span></div></div><div class="ai-topic-grid">${item.topics.map((topic, index) => `<article><span class="mono">0${index + 1} / EXPLORE</span><h4>${escape(topic.title)}</h4><p>${escape(topic.text)}</p></article>`).join('')}</div><div class="ai-practice-grid"><div class="ai-workflow"><span class="eyebrow">EXPLORE THE WORKFLOW</span><p class="ai-workflow-hint">Select a step to see how it connects.</p><div id="ai-workflow-steps" class="ai-workflow-steps" role="tablist" aria-label="${escape(item.title)} workflow">${item.workflow.map((step, index) => `<button id="ai-workflow-step-${index}" data-ai-step="${index}" role="tab" aria-label="Step ${index + 1}: ${escape(step.title)}" aria-controls="ai-workflow-detail" aria-selected="${index === state.step}" tabindex="${index === state.step ? 0 : -1}"><span>${String(index + 1).padStart(2, '0')}</span>${escape(step.title)}</button>`).join('')}</div><div id="ai-workflow-detail" role="tabpanel" aria-live="polite"></div><p class="ai-workflow-note">An explainer of the workflow. Run related educational models in the lab below.</p></div><div class="ai-starter"><span class="eyebrow">YOUR STARTING POINT</span><h4>${escape(item.starter.title)}</h4><p>${escape(item.starter.text)}</p><button class="button primary" data-launch-sim="${escape(item.starter.lab)}">Try ${escape(LAB_NAMES[item.starter.lab])} ↗</button><div class="ai-tool-links"><span class="mono">CONNECTED SOFTWARE</span>${item.tools.map(id => `<button class="text-link" data-toolkit-detail="tool:${escape(id)}">${escape(toolNames[id] || id)} ↗</button>`).join('')}</div></div></div><div class="ai-perspective"><span aria-hidden="true">↳</span><p>${escape(item.perspective)}</p></div><div class="ai-resource-heading"><span class="eyebrow">GO TO THE ORIGINAL SOURCES</span><button class="text-link" data-chapter="${item.chapter}">Read the related guide chapter ↗</button></div><div class="ai-resources">${item.resources.map(resource => `<div><span class="mono">${escape(resource.kind)}</span>${external(resource.url, resource.title + ' ↗')}</div>`).join('')}</div><div class="ai-panel-links"><button class="text-link" data-toolkit-detail="technique:${escape(item.technique)}">Explore the related technique ↗</button><button class="text-link" data-universe-select="${escape(item.universe)}">Find the connections in the universe ↗</button><a class="text-link" href="#quantum-ai-research">Follow this pillar’s news ↓</a></div>`;
    renderWorkflow();
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
  function selectPillar(id) {
    if (!AI_PILLARS.some(item => item.id === id)) return;
    state.pillar = id; state.step = 0; state.newsPillar = id; state.visible = 3;
    renderPillar(); renderNewsFilters(); renderNews();
  }
  function onClick(event) {
    const button = event.target.closest('#quantum-ai button'); if (!button || disposed) return;
    if (button.hasAttribute('data-ai-pillar')) selectPillar(button.dataset.aiPillar);
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
  document.addEventListener('click', onClick);
  $('#ai-pillar-tabs').addEventListener('keydown', event => tabKeys(event, '#ai-pillar-tabs [role="tab"]', index => selectPillar(AI_PILLARS[index].id)));
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
      const content = await response.json(); if (!AI_PILLARS.every(meta => content.pillars?.some(item => item.id === meta.id && item.workflow?.length === 4))) throw new Error('Invalid pillars');
      if (disposed) return null;
      state.content = content; renderPillar(); $('#ai-content-reviewed').textContent = `Learning content reviewed ${date(content.reviewedAt)} · research news updates automatically`; return content;
    } catch {
      if (!disposed) $('#ai-pillar-panel').innerHTML = '<p class="frontier-empty">The learning pillars could not load. Reload the page to retry, or explore the toolkit and complete guide. Research news remains available below.</p>';
      return null;
    } finally { window.clearTimeout(timeout); $('#ai-pillar-panel').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; unsubscribe(); abort.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick); } };
}
