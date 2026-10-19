import { APPLICATION_NAMES, COMPANY_NAMES, LAB_NAMES, safeExternalUrl } from './frontier-model.js';

export const TOOLKIT_TASKS = [
  ['all', 'Explore everything'], ['learn', 'Learn circuits'], ['chemistry', 'Chemistry & materials'],
  ['optimize', 'Optimization'], ['ai', 'Quantum AI'], ['reliability', 'Noise & correction'],
  ['dynamics', 'Dynamics & sensing'], ['security', 'Communications & security'],
];

export function initToolkit({ document, window }) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const external = (url, label, className = 'text-link') => {
    const safe = safeExternalUrl(url);
    return safe ? `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer" class="${className}">${escape(label)}</a>` : '';
  };
  const state = { data: null, tab: 'tools', task: 'all', query: '', application: null, company: null, visible: 6, comparison: [], history: [] };
  let disposed = false;
  const controller = new window.AbortController();
  const moveToToolkit = () => {
    $('#quantum-toolkit').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    $('#toolkit-search').focus({ preventScroll: true });
  };
  const findItem = (type, id) => state.data?.[type === 'tool' ? 'tools' : 'techniques'].find(item => item.id === id);

  function matchingItems(type) {
    return (state.data?.[type] || []).filter(item => {
      const companies = type === 'tools' ? item.companies : [...new Set(item.tools.flatMap(id => findItem('tool', id)?.companies || []))];
      const search = [item.name, item.kind, item.summary, item.bestFor, item.owner || '', ...(item.languages || []), ...item.tasks.map(id => TOOLKIT_TASKS.find(task => task[0] === id)?.[1] || ''), ...(type === 'tools' ? item.techniques.map(id => findItem('technique', id)?.name) : item.tools.map(id => findItem('tool', id)?.name))].join(' ').toLocaleLowerCase();
      return (state.task === 'all' || item.tasks.includes(state.task)) && (state.application === null || item.applications.includes(state.application)) && (!state.company || companies.includes(state.company)) && search.includes(state.query.toLocaleLowerCase());
    });
  }
  function render() {
    if (!state.data) return;
    const matches = matchingItems(state.tab), items = matches.slice(0, state.visible), tools = state.tab === 'tools';
    $$('#toolkit-tabs [role="tab"]').forEach(tab => {
      const selected = tab.dataset.toolkitTab === state.tab;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    $('#toolkit-tools-panel').hidden = !tools; $('#toolkit-techniques-panel').hidden = tools;
    $('#toolkit-tools-grid').innerHTML = ''; $('#toolkit-techniques-grid').innerHTML = '';
    $$('#toolkit-tasks button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolkitTask === state.task)));
    $('#toolkit-count').textContent = `${items.length} of ${matches.length} ${tools ? 'tools & software' : 'techniques'}`;
    $('#toolkit-more').hidden = items.length >= matches.length;
    $('#toolkit-more').textContent = `Show more ${tools ? 'tools' : 'techniques'} ↓`;
    const context = [state.application !== null ? APPLICATION_NAMES[state.application] : '', state.company ? COMPANY_NAMES[state.company] : ''].filter(Boolean).join(' · ');
    $('#toolkit-context').hidden = !context; $('#toolkit-context>span').textContent = `Connected to ${context}`;
    const grid = tools ? $('#toolkit-tools-grid') : $('#toolkit-techniques-grid');
    grid.innerHTML = items.length ? items.map(item => {
      const type = tools ? 'tool' : 'technique', selected = state.comparison.includes(item.id);
      return `<article class="toolkit-card ${tools ? '' : 'technique-card'}"><div class="toolkit-card-top"><span class="toolkit-mark" aria-hidden="true">${escape(item.mark)}</span><span class="mono">${escape(item.kind)}</span></div><span class="toolkit-owner">${escape(tools ? item.owner : item.status)}</span><h3><button data-toolkit-detail="${type}:${item.id}">${escape(item.name)}</button></h3><p>${escape(item.summary)}</p><div class="toolkit-tags">${(tools ? item.languages : [item.kind]).map(tag => `<span>${escape(tag)}</span>`).join('')}<span>${escape(tools ? item.level : `${item.tools.length} related ${item.tools.length === 1 ? 'tool' : 'tools'}`)}</span></div><div class="toolkit-card-bottom"><button class="text-link" data-toolkit-detail="${type}:${item.id}">${tools ? 'Explore the tool' : 'Explore the method'} ↗</button>${tools ? `<button class="toolkit-compare-toggle" data-compare-id="${item.id}" aria-pressed="${selected}" aria-label="${selected ? 'Remove' : 'Add'} ${escape(item.name)} ${selected ? 'from' : 'to'} comparison"${!selected && state.comparison.length >= 3 ? ' disabled' : ''}>${selected ? '✓ Selected' : '+ Compare'}</button>` : `<span class="mono">${escape(LAB_NAMES[item.lab])} ↗</span>`}</div></article>`;
    }).join('') : '<div class="frontier-empty"><span class="mono">NO MATCHING TOOLS OR METHODS</span><h3>Try a different direction.</h3><p>Widen your task, remove the context, or search for another topic.</p><button class="button secondary" data-toolkit-reset>Reset toolkit filters ↺</button></div>';
    renderComparisonTray();
  }
  function renderComparisonTray() {
    $('#toolkit-comparison').hidden = state.comparison.length === 0;
    $('#toolkit-selected').innerHTML = state.comparison.map(id => `<button data-compare-id="${id}" aria-label="Remove ${escape(findItem('tool', id).name)} from comparison">${escape(findItem('tool', id).name)} <span aria-hidden="true">×</span></button>`).join('');
    $('#toolkit-compare-open').disabled = state.comparison.length < 2;
    $('#toolkit-compare-status').textContent = state.comparison.length ? `${state.comparison.length} of 3 selected${state.comparison.length === 1 ? ' · choose one more to compare' : ''}` : 'Choose up to 3 tools to compare';
  }
  function selectTab(tab, focus = false) {
    if (!['tools', 'techniques'].includes(tab)) return;
    state.tab = tab; state.visible = 6; render();
    if (focus) $(`#toolkit-tab-${tab}`).focus();
  }
  function reset() {
    Object.assign(state, { task: 'all', query: '', application: null, company: null, visible: 6 });
    $('#toolkit-search').value = ''; render();
  }
  function related({ application = null, company = null }) {
    closeDialogs(); reset(); state.application = application; state.company = company; state.tab = 'tools'; render(); moveToToolkit();
  }
  function closeDialogs(except) {
    ['#application-dialog', '#industry-dialog', '#toolkit-dialog', '#toolkit-compare-dialog'].forEach(id => { if (id !== except && $(id)?.open) $(id).close(); });
  }
  function openDetail(type, id, back = false) {
    if (!['tool', 'technique'].includes(type)) return;
    const item = findItem(type, id); if (!item) return;
    const tools = type === 'tool', previous = state.history.at(-1);
    if (!back && (previous?.id !== id || previous?.type !== type)) state.history.push({ type, id });
    const parent = state.history.at(-2), parentItem = parent && findItem(parent.type, parent.id);
    const relations = tools ? state.data.techniques.filter(technique => technique.tools.includes(item.id)) : item.tools.map(toolId => findItem('tool', toolId));
    closeDialogs('#toolkit-dialog');
    $('#toolkit-dialog-content').innerHTML = `${parentItem ? `<button class="text-link toolkit-back" data-toolkit-back>← Back to ${escape(parentItem.name)}</button>` : ''}<span class="eyebrow">QUANTUM TOOLKIT / ${tools ? 'TOOLS & SOFTWARE' : 'TECHNIQUES'}</span><div class="toolkit-profile-heading"><span class="toolkit-mark" aria-hidden="true">${escape(item.mark)}</span><div><span class="toolkit-owner">${escape(tools ? item.owner : item.kind)}</span><h2 id="toolkit-dialog-title" tabindex="-1">${escape(item.name)}</h2></div></div><div class="toolkit-tags">${(tools ? [...item.languages, item.level] : [item.kind, item.status]).map(tag => `<span>${escape(tag)}</span>`).join('')}</div><p class="toolkit-profile-intro">${escape(item.summary)}</p><div class="profile-link-row">${external(item.url, tools ? 'Official documentation ↗' : 'Read the primary source ↗', 'button secondary')}${tools && item.start !== item.url ? external(item.start, 'Getting started ↗') : ''}</div><div class="profile-section"><span class="eyebrow">WHEN TO USE IT</span><p>${escape(item.bestFor)}</p></div>${tools ? `<div class="toolkit-facts"><div><span class="eyebrow">WHERE IT RUNS</span><p>${escape(item.execution)}</p></div><div><span class="eyebrow">ACCESS & SETUP</span><p>${escape(item.access)}</p></div></div>` : `<div class="profile-section"><span class="eyebrow">HOW THE METHOD WORKS</span><ol class="technique-flow">${item.steps.map((step, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escape(step)}</p></li>`).join('')}</ol></div>`}<div class="toolkit-limits"><span class="eyebrow">PRACTICAL LIMITS</span><p>${escape(item.limit)}</p></div><div class="profile-section"><span class="eyebrow">${tools ? 'EXPLORE RELATED TECHNIQUES' : 'TOOLS TO EXPLORE'}</span><div class="toolkit-relation-links">${relations.map(relation => `<button class="text-link" data-toolkit-detail="${tools ? 'technique' : 'tool'}:${relation.id}">${escape(relation.name)} ↗</button>`).join('')}</div><p class="toolkit-small-note">${tools ? 'Connections are learning pathways; individual methods may need extra packages or custom code.' : 'These tools support related workflows or educational models. Consult their documentation for implementations and backend support.'}</p></div><div class="profile-section"><span class="eyebrow">CONNECT THE IDEAS</span><div class="toolkit-relation-links">${item.applications.map(app => `<button class="text-link" data-toolkit-application="${app}">${escape(APPLICATION_NAMES[app])} ↗</button>`).join('')}${tools ? item.companies.map(company => `<button class="text-link" data-company-profile="${company}">${escape(COMPANY_NAMES[company])} in the atlas ↗</button>`).join('') : ''}</div><div class="profile-link-row"><button class="button primary" data-launch-sim="${item.lab}">Explore ${LAB_NAMES[item.lab]} <span>↗</span></button><button class="text-link" data-chapter="${item.chapter}">Read the guide chapter ↗</button></div><p class="toolkit-small-note">The browser lab illustrates related principles with educational models. Full SDK workflows run in their own development environments.</p></div><p class="toolkit-small-note">Curated entry · reviewed ${escape(state.data.reviewedAt)}. Follow official documentation for current installation and access details.</p>`;
    if (!$('#toolkit-dialog').open) $('#toolkit-dialog').showModal();
    $('#toolkit-dialog').scrollTop = 0; $('#toolkit-dialog-title').focus();
  }
  function openComparison() {
    if (state.comparison.length < 2) return;
    const tools = state.comparison.map(id => findItem('tool', id));
    const rows = [['Languages', tool => tool.languages.join(' · ')], ['Type', tool => tool.kind], ['Good fit', tool => tool.bestFor], ['Execution', tool => tool.execution], ['Access', tool => tool.access], ['Practical limits', tool => tool.limit]];
    $('#toolkit-compare-content').innerHTML = `<span class="eyebrow">QUANTUM TOOLKIT / SIDE BY SIDE</span><h2 id="toolkit-compare-title">Find your starting point.</h2><p>Compare the workflow and access requirements for your selected tools.</p><div class="toolkit-table-wrap" role="region" tabindex="0" aria-label="Software comparison; scroll horizontally for all columns"><table class="toolkit-table"><caption>Comparison of ${tools.map(tool => escape(tool.name)).join(', ')}</caption><thead><tr><th scope="col">Compare</th>${tools.map(tool => `<th scope="col">${escape(tool.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${tools.map(tool => `<td>${escape(value(tool))}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Next step</th>${tools.map(tool => `<td>${external(tool.start, 'Getting started ↗')}</td>`).join('')}</tr></tbody></table></div>`;
    $('#toolkit-compare-dialog').showModal();
  }
  function onClick(event) {
    const button = event.target.closest('button'); if (!button || disposed) return;
    if (button.hasAttribute('data-toolkit-tab')) selectTab(button.dataset.toolkitTab);
    if (button.hasAttribute('data-toolkit-task')) { state.task = button.dataset.toolkitTask; state.visible = 6; render(); }
    if (button.hasAttribute('data-toolkit-detail')) {
      const [type, id] = button.dataset.toolkitDetail.split(':');
      if (!$('#toolkit-dialog').open) state.history = [];
      openDetail(type, id);
    }
    if (button.hasAttribute('data-toolkit-back')) { if (state.history.length > 1) state.history.pop(); const item = state.history.at(-1); if (item) openDetail(item.type, item.id, true); }
    if (button.hasAttribute('data-compare-id')) {
      const id = button.dataset.compareId; if (!findItem('tool', id)) return;
      const wasInGrid = !!button.closest('.toolkit-grid');
      if (state.comparison.includes(id)) state.comparison = state.comparison.filter(value => value !== id);
      else if (state.comparison.length < 3) state.comparison.push(id);
      render();
      const next = wasInGrid ? $(`#toolkit-tools-grid [data-compare-id="${id}"]`) : $('#toolkit-selected button');
      if (next && !next.disabled) next.focus(); else $('#toolkit-tab-tools').focus();
    }
    if (button.hasAttribute('data-toolkit-reset')) reset();
    if (button.hasAttribute('data-toolkit-app')) { const application = Number(button.dataset.toolkitApp); if (Number.isInteger(application) && APPLICATION_NAMES[application]) related({ application }); }
    if (button.hasAttribute('data-toolkit-company') && COMPANY_NAMES[button.dataset.toolkitCompany]) related({ company: button.dataset.toolkitCompany });
    if (button.hasAttribute('data-toolkit-application')) { closeDialogs(); document.dispatchEvent(new window.CustomEvent('quantum:application', { detail: { index: Number(button.dataset.toolkitApplication) } })); }
    if (button.closest('#toolkit-dialog') && (button.hasAttribute('data-chapter') || button.hasAttribute('data-company-profile'))) $('#toolkit-dialog').close();
  }
  // Close before other modules open the destination dialog.
  document.addEventListener('click', onClick, true);
  $('#toolkit-tabs').addEventListener('keydown', event => {
    if (!event.target.matches('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); selectTab(event.key === 'Home' ? 'tools' : event.key === 'End' ? 'techniques' : state.tab === 'tools' ? 'techniques' : 'tools', true);
  });
  $('#toolkit-search').addEventListener('input', () => { state.query = $('#toolkit-search').value.trim(); state.visible = 6; render(); });
  $('#toolkit-more').addEventListener('click', () => { const previous = state.visible; state.visible += 6; render(); const grid = state.tab === 'tools' ? '#toolkit-tools-grid' : '#toolkit-techniques-grid'; $(`${grid} .toolkit-card:nth-child(${previous + 1}) h3 button`)?.focus(); });
  $('#clear-toolkit-context').addEventListener('click', () => { state.application = null; state.company = null; render(); });
  $('#toolkit-compare-open').addEventListener('click', openComparison);
  $('#toolkit-compare-clear').addEventListener('click', () => { state.comparison = []; render(); $('#toolkit-tab-tools').focus(); });
  $$('.toolkit-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $('#toolkit-tasks').innerHTML = TOOLKIT_TASKS.map(([id, label]) => `<button data-toolkit-task="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('');
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const ready = (async () => {
    try {
      const response = await window.fetch('/content/toolkit.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Toolkit unavailable');
      const data = await response.json();
      if (!Array.isArray(data.tools) || !Array.isArray(data.techniques)) throw new Error('Invalid catalog');
      if (disposed) return;
      state.data = data; render();
      $('#toolkit-tool-total').textContent = String(data.tools.length).padStart(2, '0');
      $('#toolkit-technique-total').textContent = String(data.techniques.length).padStart(2, '0');
      $('#toolkit-reviewed').textContent = `Curated catalog · reviewed ${data.reviewedAt}`;
    } catch {
      if (!disposed) { $('#toolkit-tools-grid').innerHTML = '<div class="frontier-empty"><h3>The toolkit could not load.</h3><p>Reload this page to try again. The field guide and laboratory are still available above.</p></div>'; $('#toolkit-count').textContent = 'Toolkit temporarily unavailable'; $('#toolkit-more').hidden = true; }
    } finally { window.clearTimeout(timeout); $('#toolkit-results').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; controller.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick, true); } };
}
