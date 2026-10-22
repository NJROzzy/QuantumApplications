import { NODE_KINDS, buildUniverse, neighbors, tracePath, orbitLayout } from './universe-model.js';
import { safeExternalUrl } from './frontier-model.js';

export function initUniverse({ document, window, evolutionReady }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  const state = { graph: null, evolution: null, selected: 'concept:entanglement', kind: 'all', query: '', visible: 8, expanded: false, history: ['concept:entanglement'], path: null, step: 0, title: '', pending: null, arrival: null };
  let disposed = false;
  const abort = new window.AbortController();
  const scroll = () => $('#quantum-universe').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const external = (url, label) => { const safe = safeExternalUrl(url); return safe ? `<a class="text-link" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : ''; };
  function action(node) {
    if (node.kind === 'concept') return `<button class="button primary" data-universe-concept="${node.concept}">Explore the principle ↗</button>`;
    if (node.kind === 'application') return `<button class="button primary" data-universe-app="${node.application}">Open the application ↗</button>`;
    if (['software','technique'].includes(node.kind)) return `<button class="button primary" data-toolkit-detail="${node.kind === 'software' ? 'tool' : 'technique'}:${node.ref}">Explore in the toolkit ↗</button>`;
    if (node.kind === 'company') return `<button class="button primary" data-company-profile="${node.ref}">Open the company profile ↗</button>`;
    if (['person','project'].includes(node.kind)) return `<button class="button primary" data-research-detail="${node.kind}:${node.ref}">Open the ${node.kind === 'person' ? 'research' : 'project'} profile ↗</button>`;
    return `<button class="button primary" data-universe-event="${node.event}">Find the historical milestone ↗</button>`;
  }
  function wrap(label, limit = 20) {
    const words = label.split(' '), lines = [''];
    for (const word of words) { const index = lines.length - 1; if (lines[index] && (lines[index] + ' ' + word).length > limit && lines.length < 2) lines.push(word); else lines[index] += (lines[index] ? ' ' : '') + word; }
    return lines.map(line => line.length > limit + 4 ? line.slice(0, limit + 1) + '…' : line);
  }
  function renderMap() {
    const graph = state.graph, node = graph.byId.get(state.selected), all = neighbors(graph, node.id);
    const connections = all;
    // Put the next guided step on the map even when a topic has many neighbors.
    const nextId = state.path?.[state.step + 1];
    const ordered = nextId ? [...connections.filter(item => item.id === nextId), ...connections.filter(item => item.id !== nextId)] : connections;
    const visible = ordered.slice(0, 12), positions = orbitLayout(visible.length), color = NODE_KINDS[node.kind].color;
    $('#universe-map-status').textContent = `${visible.length} of ${connections.length} direct connections shown · ${node.label}`;
    $('#universe-map').innerHTML = `<svg viewBox="0 0 900 620" class="universe-svg" role="group" aria-label="Connections around ${escape(node.label)}. Select a topic to make it the center."><defs><radialGradient id="universe-glow"><stop stop-color="${color}" stop-opacity=".12"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="450" cy="300" r="270" fill="url(#universe-glow)"/><g class="universe-orbits" fill="none"><ellipse cx="450" cy="300" rx="325" ry="205"/><ellipse cx="450" cy="300" rx="220" ry="145"/><circle cx="450" cy="300" r="100"/></g>${visible.map(({ id }, i) => `<path d="M450 300 Q${(450 + positions[i].x) / 2 + 22} ${(300 + positions[i].y) / 2 - 20} ${positions[i].x} ${positions[i].y}" class="universe-edge ${id === nextId ? 'route-edge' : ''}"/>`).join('')}<g class="universe-center"><circle cx="450" cy="300" r="72" fill="#101b17" stroke="${color}"/><circle cx="450" cy="300" r="79" fill="none" stroke="${color}" opacity=".2"/><text x="450" y="277" text-anchor="middle" fill="${color}" class="universe-center-kind">${escape(NODE_KINDS[node.kind].label.toUpperCase())}</text>${wrap(node.label, 18).map((line, i) => `<text x="450" y="${304 + i * 21}" text-anchor="middle" class="universe-center-label">${escape(line)}</text>`).join('')}</g>${visible.map(({ id, edge }, i) => {
      const target = graph.byId.get(id), position = positions[i], targetColor = NODE_KINDS[target.kind].color;
      return `<g role="button" tabindex="0" data-universe-node="${escape(id)}" class="universe-node ${id === nextId ? 'route-node' : ''}" aria-label="Explore ${escape(target.label)}; ${escape(edge.relation)}"><title>${escape(target.label)} · ${escape(edge.relation)}</title><circle cx="${position.x}" cy="${position.y}" r="30" fill="transparent"/><circle cx="${position.x}" cy="${position.y}" r="11" fill="#14201d" stroke="${targetColor}" stroke-width="2"/><circle cx="${position.x}" cy="${position.y}" r="3" fill="${targetColor}"/>${wrap(target.label).map((line, j) => `<text x="${position.x}" y="${position.y + 31 + j * 16}" text-anchor="middle" fill="${targetColor}">${escape(line)}</text>`).join('')}</g>`;
    }).join('')}</svg>`;
    $('#universe-detail').innerHTML = `<span class="universe-kind" style="--node-color:${color}">${NODE_KINDS[node.kind].label}</span><h3 id="universe-selected-title" tabindex="-1">${escape(node.label)}</h3><p class="universe-maturity">${escape(node.maturity || '')}</p><p>${escape(node.description)}</p>${state.arrival ? `<div class="universe-arrival"><span class="mono">FROM ${escape(graph.byId.get(state.arrival.from).label)}</span><strong>${escape(state.arrival.edge.relation)}</strong><p>${escape(state.arrival.edge.detail)}</p></div>` : ''}<div class="universe-detail-actions">${action(node)}${node.lab ? `<button class="text-link" data-launch-sim="${node.lab}">Explore a related lab ↗</button>` : ''}${node.chapter ? `<button class="text-link" data-chapter="${node.chapter}">Read the guide chapter ↗</button>` : ''}${node.source ? external(node.source, 'Official / historical source ↗') : ''}</div><span class="mono universe-degree">${all.length} direct connections in the full map</span>`;
    const list = state.expanded ? connections : connections.slice(0, 6);
    $('#universe-connections').innerHTML = list.length ? list.map(({ id, edge }) => { const target = graph.byId.get(id); return `<button data-universe-node="${escape(id)}" style="--node-color:${NODE_KINDS[target.kind].color}"><span>${escape(edge.relation)} · ${NODE_KINDS[target.kind].label}</span><strong>${escape(target.label)} <span aria-hidden="true">↗</span></strong></button>`; }).join('') : '<p class="universe-empty">No direct connections in this category. Choose All topics or explore another topic.</p>';
    $('#universe-connections-more').hidden = connections.length <= 6; $('#universe-connections-more').textContent = state.expanded ? 'Show fewer connections ↑' : `Show all ${connections.length} connections ↓`;
    $('#universe-back').disabled = state.history.length < 2;
    $('#universe-from').value = node.id;
    renderRoute();
  }
  function renderIndex() {
    const matches = state.graph.nodes.filter(node => (state.kind === 'all' || node.kind === state.kind) && normalize(`${node.label} ${node.description} ${node.maturity || ''}`).includes(normalize(state.query)));
    $('#universe-search-count').textContent = `${matches.length} ${state.query ? 'matching' : 'searchable'} topics`;
    $('#universe-search-results').innerHTML = matches.slice(0, state.visible).map(node => `<button data-universe-node="${escape(node.id)}" aria-pressed="${node.id === state.selected}" style="--node-color:${NODE_KINDS[node.kind].color}"><span>${NODE_KINDS[node.kind].label}</span>${escape(node.label)}</button>`).join('') || '<p class="universe-empty">No topics match this search. Try a broader term or category.</p>';
    $('#universe-results-more').hidden = matches.length <= state.visible;
  }
  function selectNode(id, keepRoute = false, remember = true) {
    if (!state.graph?.byId.has(id)) return;
    const connection = neighbors(state.graph, state.selected).find(item => item.id === id);
    state.arrival = connection ? { from: state.selected, edge: connection.edge } : null;
    state.selected = id; state.expanded = false;
    if (!keepRoute) { state.path = null; state.step = 0; }
    if (remember && state.history.at(-1) !== id) { state.history.push(id); if (state.history.length > 40) state.history.shift(); }
    renderMap(); renderIndex();
  }
  function renderRoute() {
    $('#universe-route').hidden = !state.path;
    if (!state.path) return;
    $('#universe-route-title').textContent = state.title || 'A connection to follow';
    $('#universe-route-steps').innerHTML = state.path.map((id, index) => `<button data-route-step="${index}" aria-current="${index === state.step ? 'step' : 'false'}"><span>${index + 1}</span>${escape(state.graph.byId.get(id).label)}</button>`).join('');
    $('#universe-route-position').textContent = `Step ${state.step + 1} of ${state.path.length}`;
    $('#universe-route-previous').disabled = state.step === 0; $('#universe-route-next').disabled = state.step === state.path.length - 1;
    if (state.step === 0) $('#universe-route-explanation').textContent = 'Start here, then follow the labeled relationships one step at a time. This is a learning path, not proof of a causal dependency or practical advantage.';
    else {
      const previous = state.path[state.step - 1], current = state.path[state.step], edge = neighbors(state.graph, previous).find(item => item.id === current).edge;
      $('#universe-route-explanation').innerHTML = `<strong>${escape(state.graph.byId.get(edge.source).label)} → ${escape(edge.relation)} → ${escape(state.graph.byId.get(edge.target).label)}</strong><p>${escape(edge.detail)}</p>${edge.sourceUrl ? external(edge.sourceUrl, 'Read the source ↗') : ''}`;
    }
  }
  function startRoute(path, title = '') {
    if (!state.graph) { state.pending = { path, title }; return; }
    if (!Array.isArray(path) || !path.length || path.some(id => !state.graph.byId.has(id)) || path.some((id, i) => i > 0 && !neighbors(state.graph, path[i - 1]).some(item => item.id === id))) return;
    state.kind = 'all'; $('#universe-kind').value = 'all'; state.path = path; state.step = 0; state.title = title; selectNode(path[0], true); scroll();
  }
  function routeStep(index) { if (!state.path || !Number.isInteger(index) || !state.path[index]) return; state.step = index; selectNode(state.path[index], true); }
  function onClick(event) {
    if (disposed) return;
    const node = event.target.closest('[data-universe-node]');
    if (node) { selectNode(node.dataset.universeNode); $('#universe-selected-title')?.focus({ preventScroll: true }); }
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-universe-select')) onSelect({ detail: { id: button.dataset.universeSelect } });
    if (button.hasAttribute('data-route-step')) routeStep(Number(button.dataset.routeStep));
    if (button.hasAttribute('data-universe-journey')) { const chapter = state.evolution?.story[Number(button.dataset.universeJourney)]; if (chapter) startRoute(chapter.route, chapter.title); }
    if (button.hasAttribute('data-universe-concept')) document.dispatchEvent(new window.CustomEvent('quantum:concept', { detail: { index: Number(button.dataset.universeConcept) } }));
    if (button.hasAttribute('data-universe-app')) document.dispatchEvent(new window.CustomEvent('quantum:application', { detail: { index: Number(button.dataset.universeApp) } }));
    if (button.hasAttribute('data-universe-event')) document.dispatchEvent(new window.CustomEvent('quantum:milestone', { detail: { id: button.dataset.universeEvent } }));
    if (button.hasAttribute('data-universe-story')) document.dispatchEvent(new window.CustomEvent('quantum:story', { detail: { chapter: 0 } }));
  }
  function onSelect(event) { const id = event.detail?.id; if (!state.graph) state.pending = { id }; else if (state.graph.byId.has(id)) { $$('dialog[open]').forEach(dialog => dialog.close()); state.kind = 'all'; $('#universe-kind').value = 'all'; selectNode(id); scroll(); $('#universe-selected-title')?.focus({ preventScroll: true }); } }
  function onRoute(event) { startRoute(event.detail?.path, event.detail?.title); }
  document.addEventListener('click', onClick); document.addEventListener('quantum:universe-select', onSelect); document.addEventListener('quantum:universe-route', onRoute);
  $('#universe-search').addEventListener('input', () => { state.query = $('#universe-search').value.trim(); state.visible = 8; if (state.graph) renderIndex(); });
  $('#universe-kind').addEventListener('change', () => { state.kind = $('#universe-kind').value; state.visible = 8; if (state.graph) { renderIndex(); renderMap(); } });
  $('#universe-results-more').addEventListener('click', () => { state.visible += 8; renderIndex(); });
  $('#universe-connections-more').addEventListener('click', () => { state.expanded = !state.expanded; renderMap(); });
  $('#universe-back').addEventListener('click', () => { if (state.history.length > 1) { state.history.pop(); selectNode(state.history.at(-1), false, false); } });
  $('#universe-reset').addEventListener('click', () => { state.query = ''; state.kind = 'all'; state.visible = 8; state.history = ['concept:entanglement']; $('#universe-search').value = ''; $('#universe-kind').value = 'all'; selectNode('concept:entanglement'); });
  $('#universe-trace').addEventListener('click', () => {
    if (!state.graph) return;
    const start = $('#universe-from').value, end = $('#universe-to').value, path = tracePath(state.graph, start, end);
    $('#universe-path-error').textContent = path ? '' : 'No connected path was found in this curated map.';
    if (path) startRoute(path, `${state.graph.byId.get(start).label} ↔ ${state.graph.byId.get(end).label}`);
  });
  $('#universe-route-previous').addEventListener('click', () => routeStep(state.step - 1)); $('#universe-route-next').addEventListener('click', () => routeStep(state.step + 1));
  $('#universe-route-close').addEventListener('click', () => { state.path = null; renderMap(); });
  $('#universe-map').addEventListener('keydown', event => {
    const target = event.target.closest('[data-universe-node]'); if (!target) return;
    if (['Enter',' '].includes(event.key)) { event.preventDefault(); selectNode(target.dataset.universeNode); $('#universe-selected-title').focus({ preventScroll: true }); return; }
    const nodes = $$('#universe-map [data-universe-node]'), index = nodes.indexOf(target); let next;
    if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % nodes.length;
    else if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index - 1 + nodes.length) % nodes.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = nodes.length - 1;
    if (next !== undefined) { event.preventDefault(); nodes[next].focus(); }
  });
  $('#universe-kind').innerHTML = '<option value="all">All topics</option>' + Object.entries(NODE_KINDS).map(([id, kind]) => `<option value="${id}">${kind.label}</option>`).join('');
  $('#universe-legend').innerHTML = Object.values(NODE_KINDS).map(kind => `<span><i style="background:${kind.color}"></i>${kind.label}</span>`).join('');
  const timeout = window.setTimeout(() => abort.abort(), 12000);
  const ready = (async () => {
    try {
      const get = async name => { const response = await window.fetch(`/content/${name}.json`, { signal: abort.signal }); if (!response.ok) throw new Error('Universe catalog unavailable'); return response.json(); };
      const [toolkit, industry, innovators, evolution] = await Promise.all([get('toolkit'), get('industry'), get('innovators'), evolutionReady]);
      if (!evolution || disposed) throw new Error('History unavailable');
      state.evolution = evolution; state.graph = buildUniverse({ toolkit, industry, innovators, evolution });
      $('#universe-total').textContent = `${state.graph.nodes.length} topics · ${state.graph.edges.length} labeled connections`;
      const options = Object.entries(NODE_KINDS).map(([kind, meta]) => `<optgroup label="${meta.label}">${state.graph.nodes.filter(node => node.kind === kind).map(node => `<option value="${escape(node.id)}">${escape(node.label)}</option>`).join('')}</optgroup>`).join('');
      $('#universe-from').innerHTML = options; $('#universe-to').innerHTML = options; $('#universe-to').value = 'application:1';
      $('#universe-journeys').innerHTML = [[0,'Light → lasers'],[2,'Spin → MRI'],[3,'Bell → networks'],[5,'Error correction → today']].map(([index, label]) => `<button data-universe-journey="${index}">${label} ↗</button>`).join('');
      $('#universe-selected-title')?.setAttribute('tabindex', '-1'); selectNode(state.selected);
      const pending = state.pending; state.pending = null; if (pending?.path) startRoute(pending.path, pending.title); else if (pending?.id) onSelect({ detail: pending });
      return state.graph;
    } catch {
      if (!disposed) { $('#universe-map').innerHTML = '<p class="frontier-empty">The universe map could not load. Reload the page to try again; the guide and other sections remain available.</p>'; $('#universe-detail').innerHTML = '<p>Explore the applications, timeline, and lab below while the map is unavailable.</p>'; $('#universe-total').textContent = 'Map temporarily unavailable'; }
      return null;
    } finally { window.clearTimeout(timeout); $('#universe-console').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; abort.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick); document.removeEventListener('quantum:universe-select', onSelect); document.removeEventListener('quantum:universe-route', onRoute); } };
}
