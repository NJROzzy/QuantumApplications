import { NEWS_CATEGORIES, TECHNOLOGIES, COMPANY_NAMES, APPLICATION_NAMES, LAB_NAMES, safeExternalUrl } from './frontier-model.js';

export function initFrontier({ document, window }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => { if (!value) return 'Date not supplied'; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(parsed) : 'Date not supplied'; };
  const external = (url, label, className = '') => { const safe = safeExternalUrl(url); return safe ? `<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer" class="${className}">${escape(label)}</a>` : `<span>${escape(label)}</span>`; };
  const state = { news: null, industry: null, busy: false, lastAttempt: 0, category: 'all', source: 'all', sort: 'newest', query: '', visible: 6, company: null, newsApp: null, technology: 'all', atlasQuery: '', atlasApp: null, openCompany: null };
  let timer, disposed = false, pendingController;
  const sourceIds = ['arxiv', 'ibm', 'google', 'mit', 'nature'];
  const scrollTo = id => { $(id).scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); };

  function sanitizeFeed(data) {
    if (!data || !Array.isArray(data.articles) || !Array.isArray(data.sources)) throw new Error('Invalid news response');
    return { ...data, sources: data.sources.filter(source => sourceIds.includes(source.id)), articles: data.articles.filter(article => article && typeof article.title === 'string' && sourceIds.includes(article.sourceId) && safeExternalUrl(article.url)).slice(0, 80).map(article => ({ ...article, categories: (article.categories || []).filter(id => NEWS_CATEGORIES.some(category => category.id === id)), companies: (article.companies || []).filter(id => COMPANY_NAMES[id]), applications: (article.applications || []).filter(id => Number.isInteger(id) && APPLICATION_NAMES[id]), lab: LAB_NAMES[article.lab] ? article.lab : 'qubit' })) };
  }
  function savedEdition(data) { return { ...data, mode: 'snapshot', articles: data.articles.map(article => ({ ...article, freshness: 'saved' })), sources: data.sources.map(source => ({ ...source, state: source.itemCount ? 'saved' : 'unavailable', lastSuccessAt: source.lastSuccessAt || source.checkedAt })) }; }
  async function getJSON(url, signal) {
    const controller = signal ? null : new window.AbortController();
    const timeout = controller ? window.setTimeout(() => controller.abort(), 8000) : null;
    try { const response = await window.fetch(url, { signal: signal || controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); }
    finally { if (timeout) window.clearTimeout(timeout); }
  }
  function renderCategoryControls() {
    $('#news-categories').innerHTML = NEWS_CATEGORIES.map(category => `<button data-news-category="${category.id}" aria-pressed="${category.id === state.category}" class="${category.id === state.category ? 'active' : ''}">${category.label}</button>`).join('');
    $('#atlas-technologies').innerHTML = TECHNOLOGIES.map(technology => `<button data-atlas-tech="${technology.id}" aria-pressed="${technology.id === state.technology}" class="${technology.id === state.technology ? 'active' : ''}">${technology.label}</button>`).join('');
  }
  function matchNews() {
    return (state.news?.articles || []).filter(article => (state.category === 'all' || article.categories.includes(state.category)) && (state.source === 'all' || article.sourceId === state.source) && (!state.company || article.companies.includes(state.company)) && (state.newsApp === null || article.applications.includes(state.newsApp)) && `${article.title} ${article.summary} ${article.sourceName}`.toLocaleLowerCase().includes(state.query.toLocaleLowerCase())).sort((a, b) => state.sort === 'oldest' ? (a.publishedAt || '9999').localeCompare(b.publishedAt || '9999') : (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  }
  function diverseFirstPage(articles) {
    if (state.source !== 'all' || state.sort !== 'newest') return articles.slice(0, state.visible);
    const first = [], used = new Set();
    for (const article of articles) if (!used.has(article.sourceId)) { first.push(article); used.add(article.sourceId); }
    for (const article of articles) if (first.length < 6 && !first.includes(article)) first.push(article);
    first.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    return [...first, ...articles.filter(article => !first.includes(article))].slice(0, state.visible);
  }
  function renderNews() {
    const payload = state.news;
    if (!payload) return;
    const liveCount = payload.sources.filter(source => source.state === 'live').length;
    const label = liveCount === 5 ? 'LIVE SOURCE FEED' : liveCount ? `${liveCount} / 5 SOURCES RESPONDING` : 'SAVED EDITION';
    $('#news-health').innerHTML = `<span class="tiny-dot"></span> ${label}`;
    $('#news-health').dataset.state = liveCount ? 'live' : 'saved';
    const checked = new Date(payload.checkedAt);
    const time = payload.checkedAt && Number.isFinite(checked.getTime()) ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short', hour12: false }).format(checked) : '';
    $('#news-updated').textContent = `${liveCount ? 'Checked' : 'Edition checked'} ${date(payload.checkedAt)}${time ? ` · ${time}` : ''}`;
    $('#news-updated').title = payload.checkedAt ? `Source check: ${payload.checkedAt}` : 'Source check time unavailable';
    const selectedSource = state.source;
    $('#news-source').innerHTML = '<option value="all">All sources</option>' + payload.sources.map(source => `<option value="${source.id}">${escape(source.name)}</option>`).join(''); $('#news-source').value = selectedSource;
    $('#news-sources').innerHTML = payload.sources.map(source => `<button data-news-source="${source.id}" aria-pressed="${state.source === source.id}" title="${escape(source.name)}: ${source.state === 'live' ? 'responding' : source.state === 'saved' ? 'saved coverage' : 'temporarily unavailable'}"><span class="source-dot ${source.state}"></span>${escape(source.name.replace(' · npj Quantum Information', '').replace(' · quant-ph', ''))}<small>${source.state === 'live' ? 'LIVE' : source.state === 'saved' ? 'SAVED' : 'OFFLINE'}</small></button>`).join('');
    $('#source-health-list').innerHTML = payload.sources.map(source => `<div>${external(source.homepage, source.name)}<span>${source.state === 'live' ? source.transport === 'Crossref publisher metadata' ? 'Publisher metadata via Crossref' : 'Source responding' : source.state === 'saved' ? `Saved items · last retrieved ${date(source.lastSuccessAt || payload.snapshotAt)}` : 'Temporarily unavailable'}</span></div>`).join('');
    const matching = matchNews(), visible = diverseFirstPage(matching);
    $('#news-count').textContent = `${visible.length} of ${matching.length} developments${state.source === 'all' && state.sort === 'newest' && matching.length > 6 && state.visible === 6 ? ' · source-balanced selection' : ''}`;
    const context = [state.company ? COMPANY_NAMES[state.company] : '', state.newsApp !== null ? APPLICATION_NAMES[state.newsApp] : ''].filter(Boolean).join(' · ');
    $('#news-context').hidden = !context; $('#news-context>span').textContent = `Research connected to ${context}`;
    $('#news-grid').innerHTML = visible.length ? visible.map(article => {
      const category = NEWS_CATEGORIES.find(item => item.id === ['ai', 'hardware', 'computing', 'physics', 'research'].find(id => article.categories.includes(id)))?.label || 'Research';
      const company = article.companies.find(id => state.industry?.companies.some(item => item.id === id));
      return `<article class="news-card"><div class="news-card-meta"><span class="news-source-label">${escape(article.sourceName)}</span><time${article.publishedAt ? ` datetime="${escape(article.publishedAt)}"` : ''}>${date(article.publishedAt)}</time></div><div class="news-card-tags"><span class="news-category">${category}</span><span class="publication-kind ${article.sourceId === 'arxiv' ? 'preprint' : ''}">${escape(article.kind)}</span>${article.freshness === 'saved' ? '<span class="saved-tag">SAVED</span>' : ''}</div><h3>${external(article.url, article.title)}</h3><p>${escape(article.summary)}</p><span class="summary-caption">${escape(article.summaryType || 'Source excerpt')}</span><div class="news-card-links">${external(article.url, 'Original source ↗', 'text-link')}<button class="text-link" data-launch-sim="${article.lab}">${LAB_NAMES[article.lab]} ↗</button></div>${company ? `<button class="company-mention" data-company-profile="${company}">${escape(COMPANY_NAMES[company])} · view in atlas ↗</button>` : ''}</article>`;
    }).join('') : '<div class="frontier-empty"><span class="mono">NO MATCHING SIGNALS</span><h3>Try a wider view.</h3><p>Use a different source, category, or search term. Related coverage depends on what the sources publish.</p><button class="button secondary" data-clear-news>Clear all filters ↺</button></div>';
    $('#news-grid').setAttribute('aria-busy', String(state.busy));
    $('#news-more').hidden = matching.length <= visible.length;
    $('#news-freshness').textContent = liveCount === 5 ? 'Sources checked automatically every 15 minutes while this page is open. Publication dates belong to the original sources.' : liveCount ? 'Some sources are unavailable. Saved coverage is marked individually and retains its original publication date. Automatic checks continue every 15 minutes.' : 'Live sources could not be reached. This is a saved edition with original dates; automatic checks will retry. Use the publisher links for its latest coverage.';
    renderTimelineBridge(); renderAtlas();
    if (state.openCompany && $('#industry-dialog').open && !$('#industry-dialog').contains(document.activeElement)) renderCompany(state.openCompany);
  }
  function renderTimelineBridge() {
    const articles = (state.news?.articles || []).filter(article => article.sourceId !== 'arxiv').slice(0, 2);
    $('#timeline-live-items').innerHTML = articles.map(article => `<div><time>${date(article.publishedAt)}</time>${external(article.url, article.title)}</div>`).join('');
  }
  async function refreshNews() {
    if (state.busy || disposed) return;
    state.busy = true; state.lastAttempt = Date.now(); $('#refresh-news').disabled = true; $('#refresh-news').textContent = 'Checking sources…'; $('#news-grid').setAttribute('aria-busy', 'true');
    pendingController = new window.AbortController(); const timeout = window.setTimeout(() => pendingController.abort(), 29000);
    try {
      state.news = sanitizeFeed(await getJSON('/api/news', pendingController.signal));
      try { window.localStorage.setItem('quantum-live-v1', JSON.stringify(state.news)); } catch { /* Storage may be disabled or full. */ }
    } catch {
      if (state.news) state.news = savedEdition(state.news);
      else { $('#news-grid').innerHTML = '<div class="frontier-empty"><h3>The signal is temporarily quiet.</h3><p>Research sources are unavailable. Use Refresh feed above to retry.</p></div>'; $('#news-health').innerHTML = '<span class="tiny-dot"></span> SOURCES UNAVAILABLE'; }
    } finally { window.clearTimeout(timeout); state.busy = false; if (!disposed) { $('#refresh-news').disabled = false; $('#refresh-news').textContent = 'Refresh feed ↻'; $('#news-grid').setAttribute('aria-busy', 'false'); renderNews(); } }
  }
  function clearNews() { Object.assign(state, { category: 'all', source: 'all', query: '', company: null, newsApp: null, visible: 6 }); $('#news-search').value = ''; $('#news-source').value = 'all'; renderCategoryControls(); renderNews(); }
  function relatedNews({ company = null, application = null } = {}) { $('#industry-dialog').close(); $('#application-dialog').close(); clearNews(); state.company = company; state.newsApp = application; renderNews(); scrollTo('#quantum-live'); $('#news-search').focus({ preventScroll: true }); }
  function renderAtlas() {
    if (!state.industry) return;
    const companies = state.industry.companies.filter(company => (state.technology === 'all' || company.technologies.includes(state.technology)) && (state.atlasApp === null || company.applications.includes(state.atlasApp)) && `${company.name} ${company.description} ${company.areas.join(' ')} ${company.technologies.map(id => TECHNOLOGIES.find(item => item.id === id)?.label).join(' ')}`.toLocaleLowerCase().includes(state.atlasQuery.toLocaleLowerCase()));
    $('#atlas-company-total').textContent = String(state.industry.companies.length).padStart(2, '0'); $('#atlas-count').textContent = `${companies.length} of ${state.industry.companies.length} companies`;
    $('#atlas-reviewed').textContent = `Profiles reviewed ${date(state.industry.reviewedAt)} · live coverage linked below`;
    $('#atlas-context').hidden = state.atlasApp === null; $('#atlas-context>span').textContent = state.atlasApp !== null ? `Companies exploring ${APPLICATION_NAMES[state.atlasApp]}` : '';
    $('#atlas-grid').innerHTML = companies.length ? companies.map(company => {
      const mentions = (state.news?.articles || []).filter(article => article.companies.includes(company.id));
      return `<article class="industry-card" id="company-${company.id}"><div class="industry-card-top"><span class="company-mark mark-${company.id}">${escape(company.mark)}</span><span class="mono">${escape(TECHNOLOGIES.find(item => item.id === company.technologies[0])?.label || 'Quantum technology')}</span></div><h3><button data-company-profile="${company.id}">${escape(company.name)}</button></h3><p>${escape(company.tagline)}</p><div class="industry-area-tags">${company.areas.slice(0, 2).map(area => `<span>${escape(area)}</span>`).join('')}</div><div class="industry-card-bottom"><button class="text-link" data-company-profile="${company.id}">Explore the profile ↗</button><span>${mentions.length ? `${mentions.length} research ${mentions.length === 1 ? 'mention' : 'mentions'}` : 'Source-linked profile'}</span></div></article>`;
    }).join('') : '<div class="frontier-empty"><h3>No companies in this view.</h3><p>Try another technology or search term.</p><button class="button secondary" data-clear-atlas>Reset the atlas ↺</button></div>';
  }
  function renderCompany(id) {
    const company = state.industry?.companies.find(item => item.id === id); if (!company) return;
    const mentions = (state.news?.articles || []).filter(article => article.companies.includes(id)).slice(0, 3);
    state.openCompany = id;
    $('#industry-dialog-content').innerHTML = `<div class="industry-profile-heading"><span class="company-mark mark-${id}">${escape(company.mark)}</span><div><span class="eyebrow">QUANTUM INDUSTRY ATLAS</span><h2 id="industry-dialog-title">${escape(company.name)}</h2></div></div><div class="profile-technology-tags">${company.technologies.map(technology => `<span>${escape(TECHNOLOGIES.find(item => item.id === technology)?.label)}</span>`).join('')}</div><p class="profile-description">${escape(company.description)}</p><div class="profile-link-row">${external(company.website, 'Official website ↗', 'button secondary')}${external(company.newsroom, 'Company newsroom ↗', 'text-link')}</div><div class="profile-section"><span class="eyebrow">RESEARCH AREAS</span><div class="profile-areas">${company.areas.map(area => `<span>${escape(area)}</span>`).join('')}</div></div><div class="profile-section"><span class="eyebrow">SOURCED MILESTONE${company.achievement.date ? ` / ${date(company.achievement.date)}` : ''}</span><h3>${escape(company.achievement.title)}</h3><p>${escape(company.achievement.summary)}</p>${external(company.achievement.url, 'Read the primary source ↗', 'text-link')}</div><div class="profile-section"><span class="eyebrow">DEVELOPMENTS & COVERAGE</span>${company.developments.map(item => `<article class="profile-development"><div><span>${escape(item.kind)}</span><time>${date(item.date)}</time></div><h3>${external(item.url, item.title + ' ↗')}</h3><p>${escape(item.summary)}</p></article>`).join('')}${mentions.map(article => `<article class="profile-development live-mention"><div><span>${escape(article.sourceName)} · ${article.freshness === 'saved' ? 'saved coverage' : 'Quantum Live'}</span><time>${date(article.publishedAt)}</time></div><h3>${external(article.url, article.title + ' ↗')}</h3></article>`).join('')}<button class="text-link" data-company-news="${id}">Filter Quantum Live for ${escape(company.name)} ↗</button></div><div class="profile-section"><span class="eyebrow">CONNECT THE SCIENCE</span>${["ibm", "google", "microsoft", "nvidia", "quantinuum", "dwave", "quera"].includes(id) ? `<p><button class="text-link" data-toolkit-company="${id}">Explore ${escape(company.name)} software & techniques ↗</button></p>` : ''}<div class="profile-application-links">${company.applications.map(app => `<button data-frontier-app="${app}" class="text-link">${APPLICATION_NAMES[app]} ↗</button>`).join('')}</div><div class="profile-link-row"><button class="button primary" data-launch-sim="${company.lab}">Explore ${LAB_NAMES[company.lab]} <span>↗</span></button><button class="text-link" data-frontier-timeline>Place it in the timeline ↗</button></div><p class="profile-model-note">The lab explains related principles using idealized educational models; it does not simulate this company’s proprietary hardware.</p></div><div class="profile-section profile-sources"><span class="eyebrow">OFFICIAL SOURCES</span>${company.sources.map(source => external(source.url, source.title + ' ↗', 'text-link')).join('')}<p>Profile reviewed ${date(state.industry.reviewedAt)}. Live mentions update with the news feed. Announcements and future targets are attributed to their sources.</p></div>`;
  }
  function openCompany(id) { if (!state.industry?.companies.some(company => company.id === id)) return; $('#application-dialog').close(); renderCompany(id); if (!$('#industry-dialog').open) $('#industry-dialog').showModal(); $('#industry-dialog').scrollTop = 0; }
  function clearAtlas() { state.technology = 'all'; state.atlasQuery = ''; state.atlasApp = null; $('#atlas-search').value = ''; renderCategoryControls(); renderAtlas(); }
  function relatedAtlas(application) { $('#application-dialog').close(); clearAtlas(); state.atlasApp = application; renderAtlas(); scrollTo('#industry-atlas'); }
  document.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.hasAttribute('data-news-category')) { state.category = target.dataset.newsCategory; state.visible = 6; renderCategoryControls(); renderNews(); }
    if (target.hasAttribute('data-news-source')) { state.source = state.source === target.dataset.newsSource ? 'all' : target.dataset.newsSource; state.visible = 6; renderNews(); }
    if (target.hasAttribute('data-atlas-tech')) { state.technology = target.dataset.atlasTech; renderCategoryControls(); renderAtlas(); }
    if (target.hasAttribute('data-company-profile')) openCompany(target.dataset.companyProfile);
    if (target.hasAttribute('data-company-news')) relatedNews({ company: target.dataset.companyNews });
    if (target.hasAttribute('data-news-app')) relatedNews({ application: Number(target.dataset.newsApp) });
    if (target.hasAttribute('data-atlas-app')) relatedAtlas(Number(target.dataset.atlasApp));
    if (target.hasAttribute('data-frontier-app')) { $('#industry-dialog').close(); document.dispatchEvent(new window.CustomEvent('quantum:application', { detail: { index: Number(target.dataset.frontierApp) } })); }
    if (target.hasAttribute('data-frontier-timeline')) { $('#industry-dialog').close(); document.dispatchEvent(new window.CustomEvent('quantum:timeline', { detail: { era: 3 } })); scrollTo('#evolution'); }
    if (target.hasAttribute('data-clear-news')) clearNews();
    if (target.hasAttribute('data-clear-atlas')) clearAtlas();
  });
  $('#refresh-news').addEventListener('click', refreshNews);
  $('#news-search').addEventListener('input', () => { state.query = $('#news-search').value.trim(); state.visible = 6; renderNews(); });
  $('#news-source').addEventListener('change', () => { state.source = $('#news-source').value; state.visible = 6; renderNews(); });
  $('#news-sort').addEventListener('change', () => { state.sort = $('#news-sort').value; state.visible = 6; renderNews(); });
  $('#news-more').addEventListener('click', () => { state.visible += 6; renderNews(); });
  $('#clear-news-context').addEventListener('click', () => { state.company = null; state.newsApp = null; renderNews(); });
  $('#atlas-search').addEventListener('input', () => { state.atlasQuery = $('#atlas-search').value.trim(); renderAtlas(); });
  $('#clear-atlas-context').addEventListener('click', () => { state.atlasApp = null; renderAtlas(); });
  $('.industry-close').addEventListener('click', () => $('#industry-dialog').close());
  $('#industry-dialog').addEventListener('close', () => { state.openCompany = null; });
  const canAutoRefresh = () => !document.hidden && !document.querySelector('dialog[open]') && !$('#news-grid').contains(document.activeElement) && !$('#atlas-grid').contains(document.activeElement);
  function onVisibility() { if (canAutoRefresh() && Date.now() - state.lastAttempt >= 15 * 60 * 1000) refreshNews(); }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onVisibility);
  renderCategoryControls();
  const ready = (async () => {
    const results = await Promise.allSettled([getJSON('/content/industry.json'), getJSON('/content/news-snapshot.json')]);
    if (disposed) return;
    if (results[0].status === 'fulfilled' && Array.isArray(results[0].value.companies)) { state.industry = results[0].value; renderAtlas(); }
    else { $('#atlas-grid').innerHTML = '<div class="frontier-empty"><h3>The atlas could not load.</h3><p>Reload this page to try again.</p></div>'; $('#atlas-count').textContent = 'Atlas temporarily unavailable'; }
    if (results[1].status === 'fulfilled') { try { state.news = savedEdition(sanitizeFeed(results[1].value)); } catch { /* Try the last usable browser edition below. */ } }
    try { const cached = savedEdition(sanitizeFeed(JSON.parse(window.localStorage.getItem('quantum-live-v1')))); if (!state.news || (cached.checkedAt || '') > (state.news.checkedAt || '')) state.news = cached; } catch { /* The live request can initialize the panel. */ }
    renderNews(); await refreshNews();
    if (!disposed) timer = window.setInterval(() => { if (canAutoRefresh()) refreshNews(); }, 15 * 60 * 1000);
  })();
  return { ready, refreshNews, destroy() { disposed = true; window.clearInterval(timer); pendingController?.abort(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('online', onVisibility); } };
}
