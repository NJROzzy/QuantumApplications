import { safeExternalUrl } from './frontier-model.js';
import { pioneerId } from './universe-model.js';

export function initEvolution({ document, window }) {
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let data, era = 0, chapter = 0, disposed = false, pendingEra = false;
  const abort = new window.AbortController();
  const scroll = element => element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  function renderEra(index) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    era = index; if (!data) { pendingEra = true; return; }
    $$('[data-era]').forEach((button, i) => { button.classList.toggle('active', i === index); button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; button.innerHTML = `${escape(data.eras[i].span)} <span>${escape(data.eras[i].label)}</span>`; });
    $('#timeline-panel').setAttribute('aria-labelledby', `era-${index}`);
    $('#timeline-panel').innerHTML = data.eras[index].events.map(event => {
      const source = safeExternalUrl(event.source.url), node = event.people.length ? pioneerId(event.people[0]) : event.connections?.[0] || `concept:${event.topics[0]}`;
      return `<article class="timeline-item" id="milestone-${event.id}" tabindex="-1"><span class="year">${escape(event.year)}</span><h3>${escape(event.title)}</h3><p class="timeline-contributors">${escape(event.people.length ? event.people.join(' · ') : event.contributors)}</p><p>${escape(event.text)}</p><div class="timeline-item-links">${source ? `<a href="${escape(source)}" target="_blank" rel="noopener noreferrer" class="text-link">Historical / primary source ↗</a>` : ''}<button class="text-link" data-evolution-universe="${escape(node)}">See the connection ↗</button></div></article>`;
    }).join('');
  }
  function renderStory(index, remember = true) {
    if (!data || !Number.isInteger(index) || !data.story[index]) return;
    chapter = index; const item = data.story[index];
    $$('#story-chapters [role="tab"]').forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
    $('#story-panel').setAttribute('aria-labelledby', `story-chapter-${index}`);
    $('#story-position').textContent = `Chapter ${index + 1} of ${data.story.length} · ${item.span}`;
    $('#story-progress').value = index + 1; $('#story-progress').max = data.story.length;
    $('#story-panel').innerHTML = `<div class="story-chapter-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div><div class="story-copy"><span class="eyebrow">${escape(item.span)} / A SHARED HISTORY</span><h3>${escape(item.title)}</h3><p class="story-question">${escape(item.question)}</p>${item.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}<div class="story-takeaway"><span class="mono">THE THREAD THAT CONTINUES</span><p>${escape(item.takeaway)}</p></div><div class="story-sources"><span class="mono">MILESTONES & SOURCES</span>${item.events.map(id => { const event = data.eras.flatMap(era => era.events).find(event => event.id === id); return `<button class="text-link" data-milestone="${id}">${escape(event.year)} · ${escape(event.title)} ↗</button>`; }).join('')}</div><div class="story-actions"><button class="button primary" data-story-universe="${index}">Follow this thread in the universe ↗</button><button class="text-link" data-launch-sim="${item.lab}">Try a related lab ↗</button><button class="text-link" data-chapter="${item.chapter}">Read the guide ↗</button></div></div>`;
    $('#story-previous').disabled = index === 0; $('#story-next').disabled = index === data.story.length - 1;
    $('#story-next').textContent = index === data.story.length - 1 ? 'You reached the current frontier' : 'Continue the story →';
    renderEra(item.era);
    if (remember) try { window.localStorage.setItem('quantum-story-chapter-v1', String(index)); } catch { /* Reading the story does not require storage. */ }
  }
  function focusMilestone(id) {
    const found = data?.eras.find(item => item.events.some(event => event.id === id)); if (!found) return;
    renderEra(found.id); const card = $(`#milestone-${id}`); scroll(card); card.focus({ preventScroll: true });
  }
  function onClick(event) {
    const button = event.target.closest('button'); if (!button || disposed) return;
    if (button.hasAttribute('data-era')) renderEra(Number(button.dataset.era));
    if (button.hasAttribute('data-story-chapter')) renderStory(Number(button.dataset.storyChapter));
    if (button.hasAttribute('data-milestone')) focusMilestone(button.dataset.milestone);
    if (button.hasAttribute('data-story-universe') && data) {
      const item = data.story[Number(button.dataset.storyUniverse)];
      if (item) document.dispatchEvent(new window.CustomEvent('quantum:universe-route', { detail: { path: item.route, title: item.title } }));
    }
    if (button.hasAttribute('data-evolution-universe')) document.dispatchEvent(new window.CustomEvent('quantum:universe-select', { detail: { id: button.dataset.evolutionUniverse } }));
  }
  function tabKeys(event, selector, select) {
    const buttons = $$(selector), index = buttons.indexOf(document.activeElement); if (index < 0) return;
    let next;
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); select(next); buttons[next].focus(); }
  }
  function onTimeline(event) { const index = Number(event.detail?.era); renderEra(index); $(`#era-${era}`)?.focus({ preventScroll: true }); }
  function onMilestone(event) { if (data) focusMilestone(event.detail?.id); }
  function onStory(event) { if (data) { renderStory(Number(event.detail?.chapter) || 0); if (event.detail?.scroll !== false) scroll($('#quantum-story')); } }
  document.addEventListener('click', onClick);
  document.addEventListener('quantum:timeline', onTimeline); document.addEventListener('quantum:milestone', onMilestone); document.addEventListener('quantum:story', onStory);
  $('.era-tabs').addEventListener('keydown', event => tabKeys(event, '[data-era]', renderEra));
  $('#story-chapters').addEventListener('keydown', event => tabKeys(event, '#story-chapters [role="tab"]', renderStory));
  $('#story-previous').addEventListener('click', () => renderStory(chapter - 1));
  $('#story-next').addEventListener('click', () => renderStory(chapter + 1));
  $('#story-restart').addEventListener('click', () => renderStory(0));
  const timeout = window.setTimeout(() => abort.abort(), 10000);
  const ready = (async () => {
    try {
      const response = await window.fetch('/content/evolution.json', { signal: abort.signal }); if (!response.ok) throw new Error('History unavailable');
      const payload = await response.json(); if (!Array.isArray(payload.eras) || !Array.isArray(payload.story)) throw new Error('Invalid history');
      if (disposed) return null;
      data = payload; const requestedEra = era;
      $('#evolution-context').textContent = data.intro;
      $('#evolution-reviewed').textContent = `${data.eras.flatMap(item => item.events).length} selected milestones · sources reviewed ${data.reviewedAt}`;
      $('#story-chapters').innerHTML = data.story.map((item, i) => `<button id="story-chapter-${i}" role="tab" aria-controls="story-panel" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}" data-story-chapter="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${escape(item.title)}</button>`).join('');
      let saved = 0; try { const raw = window.localStorage.getItem('quantum-story-chapter-v1'); const candidate = raw === null ? 0 : Number(raw); if (Number.isInteger(candidate) && data.story[candidate]) saved = candidate; } catch { /* Use the first chapter when storage is unavailable. */ }
      renderStory(saved, false); if (pendingEra || !saved) renderEra(requestedEra); return data;
    } catch {
      if (!disposed) { $('#story-panel').innerHTML = '<p class="frontier-empty">The story could not load. Reload the page to retry, or open the complete guide below.</p>'; $('#timeline-panel').innerHTML = '<p class="frontier-empty">The timeline is temporarily unavailable. The original history remains in chapter 3 of the guide.</p>'; $('#story-next').disabled = true; $('#story-previous').disabled = true; }
      return null;
    } finally { window.clearTimeout(timeout); $('#quantum-story').setAttribute('aria-busy', 'false'); }
  })();
  return { ready, destroy() { disposed = true; abort.abort(); window.clearTimeout(timeout); document.removeEventListener('click', onClick); document.removeEventListener('quantum:timeline', onTimeline); document.removeEventListener('quantum:milestone', onMilestone); document.removeEventListener('quantum:story', onStory); } };
}
