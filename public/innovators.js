import { APPLICATION_NAMES, COMPANY_NAMES, LAB_NAMES, safeExternalUrl } from './frontier-model.js';

export const RESEARCH_AREAS = [['all', 'All research'], ['computing', 'Quantum computing'], ['hardware', 'Devices & hardware'], ['software', 'Software & AI'], ['networking', 'Quantum networks'], ['sensing', 'Sensing'], ['foundations', 'Theory & error correction']];
export const PROJECT_STAGES = { platform: 'Available platform', experiment: 'Experimental result', development: 'In development', theory: 'Theory & simulation', program: 'Research program' };

export function initInnovators({ document, window }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  const external = (url, label, className = 'text-link') => {
    const safe = safeExternalUrl(url);
    return safe ? `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer" class="${className}">${escape(label)}</a>` : '';
  };
  const date = value => value ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'Source undated';
  const state = { data: null, view: 'people', area: 'all', region: 'all', query: '', visible: 6, company: null, application: null, history: [] };
  let disposed = false;
  const abort = new window.AbortController();
  const person = id => state.data?.people.find(item => item.id === id);
  const project = id => state.data?.projects.find(item => item.id === id);
  const closeOthers = except => $$('dialog[open]').forEach(dialog => { if (dialog.id !== except) dialog.close(); });
  const associatedProjects = (item, people) => people ? item.projects.map(project) : [item];
  function matches() {
    const people = state.view === 'people';
    return (state.data?.[state.view] || []).filter(item => {
      const projects = associatedProjects(item, people), members = people ? [item] : item.people.map(person);
      const companies = [...new Set([...item.companies, ...projects.flatMap(p => p.companies)])];
      const text = [item.name, item.organization, item.role || '', item.focus || '', item.summary || '', ...projects.map(p => `${p.name} ${p.summary} ${p.collaborators}`), ...members.map(p => `${p.name} ${p.organization}`)].join(' ');
      return (state.area === 'all' || projects.some(p => p.category === state.area)) && (state.region === 'all' || members.some(p => p.region === state.region)) && (!state.company || companies.includes(state.company)) && (state.application === null || projects.some(p => p.applications.includes(state.application))) && normalize(text).includes(normalize(state.query));
    });
  }
  function render() {
    if (!state.data) return;
    const people = state.view === 'people', filtered = matches(), items = filtered.slice(0, state.visible);
    $$('#innovator-tabs [role="tab"]').forEach(tab => { const selected = tab.dataset.researchView === state.view; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    $('#innovator-people-panel').hidden = !people; $('#innovator-projects-panel').hidden = people;
    $$('#innovator-areas button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.researchArea === state.area)));
    const context = [state.company ? COMPANY_NAMES[state.company] : '', state.application !== null ? APPLICATION_NAMES[state.application] : ''].filter(Boolean).join(' · ');
    $('#innovator-context').hidden = !context; $('#innovator-context>span').textContent = `Work connected to ${context}`;
    $('#innovator-count').textContent = `${items.length} of ${filtered.length} ${people ? 'people & teams' : 'projects & research programs'}`;
    $('#innovator-more').hidden = items.length >= filtered.length;
    $('#innovator-more').textContent = `Show more ${people ? 'people & teams' : 'projects'} ↓`;
    $('#innovator-people-grid').innerHTML = ''; $('#innovator-projects-grid').innerHTML = '';
    const grid = people ? $('#innovator-people-grid') : $('#innovator-projects-grid');
    grid.innerHTML = items.length ? items.map(item => people ? `<article class="research-card"><div class="research-card-meta"><span class="research-initials" aria-hidden="true">${escape(item.initials)}</span><span>${escape(item.kind)}<br>${escape(item.region)}</span></div><span class="research-affiliation">${escape(item.organization)}</span><h3><button data-research-detail="person:${item.id}">${escape(item.name)}</button></h3><p>${escape(item.focus)}</p><div class="research-card-bottom"><button class="text-link" data-research-detail="person:${item.id}">Meet the researcher${item.kind === 'Researcher' ? '' : 's'} ↗</button><button class="research-project-link" data-research-detail="project:${item.projects[0]}">${item.projects.length} linked ${item.projects.length === 1 ? 'project' : 'projects'} ↗</button></div></article>` : `<article class="research-card project-card"><div class="research-card-meta"><span class="research-stage stage-${item.stage}">${PROJECT_STAGES[item.stage]}</span><time${item.source.date ? ` datetime="${item.source.date}"` : ''}>${date(item.source.date)}</time></div><span class="research-affiliation">${escape(item.organization)}</span><h3><button data-research-detail="project:${item.id}">${escape(item.name)}</button></h3><p>${escape(item.summary)}</p><span class="research-source-kind">${escape(item.source.kind)}</span><div class="research-card-bottom"><button class="text-link" data-research-detail="project:${item.id}">Explore the project ↗</button><span>${item.people.length} linked ${item.people.length === 1 ? 'profile' : 'profiles'}</span></div></article>`).join('') : '<div class="frontier-empty"><h3>No matching people or projects.</h3><p>Try a broader topic, region, or name.</p><button class="button secondary" data-research-reset>Reset research filters ↺</button></div>';
  }
  function switchView(view, focus = false) {
    if (!['people', 'projects'].includes(view)) return;
    state.view = view; state.visible = 6; render(); if (focus) $(`#innovator-tab-${view}`).focus();
  }
  function reset() {
    Object.assign(state, { area: 'all', region: 'all', query: '', visible: 6, company: null, application: null });
    $('#innovator-search').value = ''; $('#innovator-region').value = 'all'; render();
  }
  function detail(type, id, back = false) {
    const item = type === 'person' ? person(id) : type === 'project' ? project(id) : null;
    if (!item) return;
    const dialog = $('#innovator-dialog');
    if (!dialog.open) state.history = [];
    if (!back && (state.history.at(-1)?.id !== id || state.history.at(-1)?.type !== type)) state.history.push({ type, id });
    const parent = state.history.at(-2), parentItem = parent && (parent.type === 'person' ? person(parent.id) : project(parent.id));
    closeOthers('innovator-dialog');
    const header = `${parentItem ? `<button class="text-link research-back" data-research-back>← Back to ${escape(parentItem.name)}</button>` : ''}<span class="eyebrow">QUANTUM INNOVATORS / ${type === 'person' ? 'PEOPLE & TEAMS' : 'CURRENT PROJECTS'}</span><h2 id="innovator-dialog-title" tabindex="-1">${escape(item.name)}</h2><p class="research-profile-affiliation">${escape(item.organization)}</p>`;
    $('#innovator-dialog-content').innerHTML = header + (type === 'person' ? `<span class="research-stage">${escape(item.kind)} · ${escape(item.region)}</span><p class="research-role">${escape(item.role)}</p><p class="research-profile-intro">${escape(item.focus)}</p><div class="profile-section"><span class="eyebrow">WHAT THEY WORK ON</span><p>${escape(item.contribution)}</p></div><div class="profile-link-row">${external(item.url, 'Official profile / source ↗', 'button secondary')}${item.companies.map(company => `<button class="text-link" data-company-profile="${company}">${escape(COMPANY_NAMES[company])} in the atlas ↗</button>`).join('')}</div><div class="profile-section"><span class="eyebrow">CONNECTED PROJECTS & RESEARCH</span><div class="research-related-projects">${item.projects.map(id => { const p = project(id); return `<button data-research-detail="project:${id}"><span>${PROJECT_STAGES[p.stage]} · ${date(p.source.date)}</span><strong>${escape(p.name)} ↗</strong><small>${escape(p.organization)}</small></button>`; }).join('')}</div></div>` : `<div class="research-project-meta"><span class="research-stage stage-${item.stage}">${PROJECT_STAGES[item.stage]}</span><span>${escape(item.source.kind)}</span><time${item.source.date ? ` datetime="${item.source.date}"` : ''}>${date(item.source.date)}</time></div><p class="research-profile-intro">${escape(item.summary)}</p><div class="profile-section"><span class="eyebrow">PEOPLE & COLLABORATORS</span><div class="research-member-links">${item.people.map(id => `<button class="text-link" data-research-detail="person:${id}">${escape(person(id).name)} ↗</button>`).join('')}</div><p>${escape(item.collaborators)}</p></div><div class="research-evidence"><span class="eyebrow">WHAT THE SOURCE REPORTS</span><p>${escape(item.evidence)}</p>${external(item.source.url, item.source.title + ' ↗')}</div><div class="profile-section"><span class="eyebrow">QUESTION TO FOLLOW</span><p>${escape(item.question)}</p><p class="research-small-note">An editorial question for following progress; it is not a promised project deliverable.</p></div><div class="profile-link-row">${external(item.resource, 'Official program / further reading ↗', 'button secondary')}</div><div class="profile-section"><span class="eyebrow">EXPLORE THE CONNECTIONS</span><div class="research-member-links">${item.tools.map(id => `<button class="text-link" data-toolkit-detail="tool:${id}">${escape(state.tools?.tools.find(tool => tool.id === id)?.name || id)} ↗</button>`).join('')}${item.techniques.map(id => `<button class="text-link" data-toolkit-detail="technique:${id}">${escape(state.tools?.techniques.find(technique => technique.id === id)?.name || id)} ↗</button>`).join('')}${item.companies.map(company => `<button class="text-link" data-company-profile="${company}">${escape(COMPANY_NAMES[company])} in the atlas ↗</button>`).join('')}</div><div class="research-member-links">${item.applications.map(index => `<button class="text-link" data-research-application="${index}">${escape(APPLICATION_NAMES[index])} ↗</button>`).join('')}</div><div class="profile-link-row"><button class="button primary" data-launch-sim="${item.lab}">Explore ${LAB_NAMES[item.lab]} ↗</button><button class="text-link" data-chapter="${item.chapter}">Read the guide chapter ↗</button></div><p class="research-small-note">Software links and the lab explain related methods. They do not reproduce this project’s results or imply that its team uses a listed tool.</p></div>`);
    $('#innovator-dialog-content').insertAdjacentHTML('beforeend', `<p class="research-small-note">Reviewed ${date(state.data.reviewedAt)}. Selected public profiles and recent work; projects are collaborative. This catalog is curated and does not update automatically. Follow the original source for current status.</p>`);
    if (!dialog.open) dialog.showModal(); dialog.scrollTop = 0; $('#innovator-dialog-title').focus();
  }
  function onClick(event) {
    if (disposed) return;
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-research-view')) switchView(button.dataset.researchView);
    if (button.hasAttribute('data-research-area')) { state.area = button.dataset.researchArea; state.visible = 6; render(); }
    if (button.hasAttribute('data-research-detail')) { const [type, id] = button.dataset.researchDetail.split(':'); detail(type, id); }
    if (button.hasAttribute('data-research-back') && state.history.length > 1) { state.history.pop(); const previous = state.history.at(-1); detail(previous.type, previous.id, true); }
    if (button.hasAttribute('data-research-reset')) { reset(); $('#innovator-search').focus({ preventScroll: true }); }
    if (button.hasAttribute('data-research-application')) { closeOthers(); document.dispatchEvent(new window.CustomEvent('quantum:application', { detail: { index: Number(button.dataset.researchApplication) } })); }
    if (button.hasAttribute('data-innovators-company') || button.hasAttribute('data-innovators-app')) {
      const company = button.dataset.innovatorsCompany, application = Number(button.dataset.innovatorsApp);
      if ((company && !COMPANY_NAMES[company]) || (!company && (!Number.isInteger(application) || !APPLICATION_NAMES[application]))) return;
      closeOthers(); reset(); state.view = 'projects'; state.company = company || null; state.application = company ? null : application; render();
      $('#quantum-innovators').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); $('#innovator-search').focus({ preventScroll: true });
    }
    if (button.closest('#innovator-dialog') && ['data-toolkit-detail', 'data-company-profile', 'data-chapter'].some(attribute => button.hasAttribute(attribute))) $('#innovator-dialog').close();
  }
  // Runs before the toolkit capture handler so destination dialogs never stack.
  document.addEventListener('click', onClick, true);
  $('#innovator-search').addEventListener('input', () => { state.query = $('#innovator-search').value.trim(); state.visible = 6; render(); });
  $('#innovator-region').addEventListener('change', () => { state.region = $('#innovator-region').value; state.visible = 6; render(); });
  $('#innovator-more').addEventListener('click', () => { const first = state.visible + 1; state.visible += 6; render(); $(`#innovator-${state.view}-grid .research-card:nth-child(${first}) h3 button`)?.focus(); });
  $('#innovator-clear-context').addEventListener('click', () => { state.company = null; state.application = null; render(); });
  $('#innovator-tabs').addEventListener('keydown', event => {
    if (!event.target.matches('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); switchView(event.key === 'Home' ? 'people' : event.key === 'End' ? 'projects' : state.view === 'people' ? 'projects' : 'people', true);
  });
  $('.innovator-close').addEventListener('click', () => $('#innovator-dialog').close());
  $('#innovator-areas').innerHTML = RESEARCH_AREAS.map(([id, label]) => `<button data-research-area="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('');
  const timeout = window.setTimeout(() => abort.abort(), 10000);
  const ready = (async () => {
    try {
      const response = await window.fetch('/content/innovators.json', { signal: abort.signal });
      if (!response.ok) throw new Error('Research catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data.people) || !Array.isArray(data.projects)) throw new Error('Invalid research catalog');
      if (disposed) return;
      state.data = data;
      $('#innovator-person-total').textContent = String(data.people.length).padStart(2, '0'); $('#innovator-project-total').textContent = String(data.projects.length).padStart(2, '0');
      $('#innovator-reviewed').textContent = `Reviewed ${date(data.reviewedAt)} · curated from primary sources`;
      const regions = [...new Set(data.people.map(item => item.region))].sort();
      $('#innovator-region').innerHTML = '<option value="all">All regions</option>' + regions.map(region => `<option value="${escape(region)}">${escape(region)}</option>`).join('');
      render();
      try { const tools = await window.fetch('/content/toolkit.json', { signal: abort.signal }); if (tools.ok) state.tools = await tools.json(); } catch { /* IDs remain readable if the optional tool labels are unavailable. */ }
    } catch {
      if (!disposed) { $('#innovator-people-grid').innerHTML = '<div class="frontier-empty"><h3>The research directory could not load.</h3><p>Reload the page to retry, or explore the Industry Atlas and field guide.</p></div>'; $('#innovator-count').textContent = 'Directory temporarily unavailable'; $('#innovator-more').hidden = true; }
    } finally { window.clearTimeout(timeout); $('#innovator-results').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; abort.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick, true); } };
}
