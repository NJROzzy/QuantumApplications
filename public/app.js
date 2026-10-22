import { initSimulations } from './simulations.js';
import { initFrontier } from './frontier.js';
import { initToolkit } from './toolkit.js';
import { initInnovators } from './innovators.js';
import { initEvolution } from './evolution.js';
import { initUniverse } from './universe.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const concepts = [
  { title: 'Superposition', tag: 'ONE STATE. MULTIPLE AMPLITUDES.', text: 'A quantum state can be a coherent combination of basis states. The amplitudes determine the probabilities of measurement outcomes; their relative phase makes interference possible.', equation: '|ψ⟩ = α|0⟩ + β|1⟩', type: 'wave' },
  { title: 'Entanglement', tag: 'CONNECTION AT A DEEPER LEVEL.', text: 'Two systems can share a joint state that cannot be reduced to independent states of its parts. Their measurement correlations exceed classical limits, without enabling faster-than-light messages.', equation: '|Φ⁺⟩ = (|00⟩ + |11⟩) / √2', type: 'entangled' },
  { title: 'Wave–particle behavior', tag: 'NATURE DOES BOTH.', text: 'Light and matter produce interference patterns, yet register as localized detection events. The quantum state describes probability amplitudes; squared amplitude gives measurement probability.', equation: 'P(m) = |⟨m|ψ⟩|²', type: 'wave' },
  { title: 'Quantization', tag: 'NATURE HAS ALLOWED LEVELS.', text: 'Some quantities, such as the energy of a bound atom, have discrete allowed values. Planck’s explanation of blackbody radiation introduced energy quanta, helping start quantum theory.', equation: 'E = hf', type: 'levels' },
  { title: 'Uncertainty', tag: 'A FUNDAMENTAL LIMIT.', text: 'Noncommuting observables, including position and momentum, cannot generally have simultaneously arbitrarily precise outcomes. This relationship is part of quantum theory itself.', equation: 'Δx Δp ≥ ħ / 2', type: 'wave' },
  { title: 'Measurement & decoherence', tag: 'WHEN A STATE MEETS ITS WORLD.', text: 'Measurements give probabilistic outcomes. Interactions with an uncontrolled environment destroy accessible phase coherence, a central challenge for quantum processors and networks.', equation: '|α|² + |β|² = 1', type: 'decoherence' },
  { title: 'Tunneling', tag: 'THROUGH A CLASSICAL BARRIER.', text: 'A quantum amplitude can extend into and through a classically forbidden barrier. Tunneling underlies scanning tunneling microscopes, some electronic devices, and nuclear processes.', equation: 'T ∝ exp(−2κa)  [simple barrier]', type: 'tunnel' },
  { title: 'Spin & indistinguishability', tag: 'INTRINSIC QUANTUM IDENTITY.', text: 'Spin is intrinsic angular momentum. Fermions obey the Pauli exclusion principle, shaping atoms and electronic bands. Bosons can occupy the same state, enabling collective quantum behavior.', equation: 's = ½  [electron spin quantum number]', type: 'entangled' },
];

function diagram(type) {
  const begin = '<svg viewBox="0 0 280 230" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="dg"><stop stop-color="#c5f277" stop-opacity=".12"/><stop offset="1" stop-color="#c5f277" stop-opacity="0"/></radialGradient></defs><circle cx="140" cy="115" r="105" fill="url(#dg)"/>';
  const end = '</svg>';
  if (type === 'entangled') return begin + '<path d="M75 115H205" stroke="#c5f277" stroke-dasharray="3 6" opacity=".5"/><g stroke="#c5f277"><ellipse cx="75" cy="115" rx="48" ry="18" transform="rotate(-45 75 115)"/><ellipse cx="75" cy="115" rx="48" ry="18" transform="rotate(45 75 115)"/><ellipse cx="205" cy="115" rx="48" ry="18" transform="rotate(-45 205 115)"/><ellipse cx="205" cy="115" rx="48" ry="18" transform="rotate(45 205 115)"/></g><circle cx="75" cy="115" r="5" fill="#c5f277"/><circle cx="205" cy="115" r="5" fill="#c5f277"/><text x="124" y="181" fill="#829c69" font-family="monospace" font-size="10">A ⊗ B</text>' + end;
  if (type === 'levels') return begin + '<g stroke="#4b613a" stroke-width="1"><path d="M42 175H238M42 130H238M42 86H238M42 44H238"/></g><g stroke="#c5f277" stroke-width="2"><path d="M64 175H215M64 130H215M64 86H215M64 44H215"/></g><path d="M140 166V96M134 102L140 92L146 102" stroke="#c5f277"/><circle cx="140" cy="175" r="5" fill="#c5f277"/><g fill="#809a67" font-size="10" font-family="monospace"><text x="14" y="179">n₁</text><text x="14" y="134">n₂</text><text x="14" y="90">n₃</text><text x="153" y="118">ΔE</text></g>' + end;
  if (type === 'tunnel') return begin + '<path d="M20 162H260" stroke="#34452b"/><path d="M120 162V55H163V162" fill="#c5f2770c" stroke="#738e52"/><path d="M15 110Q28 50 41 110T67 110T93 110T119 110" stroke="#c5f277" stroke-width="2"/><path d="M120 110Q145 116 164 122Q177 103 190 122T216 122T242 122T268 122" stroke="#c5f277" stroke-width="1.5"/><text x="113" y="188" fill="#809a67" font-size="9" font-family="monospace">BARRIER</text>' + end;
  const paths = Array.from({ length: type === 'decoherence' ? 5 : 3 }, (_, line) => {
    const points = Array.from({ length: 140 }, (_, i) => {
      const x = 10 + i * 1.87;
      const env = Math.sin(i / 139 * Math.PI) ** .6;
      const y = 113 + Math.sin(i / 139 * Math.PI * 4 + line * .8) * (47 - line * 7) * env;
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return `<path d="${points}" stroke="${line === 0 ? '#c5f277' : '#718b54'}" stroke-width="${line === 0 ? '2' : '1'}" opacity="${1 - line * .17}"/>`;
  }).join('');
  return begin + '<path d="M10 113H270M140 35V194" stroke="#35472c" stroke-dasharray="2 5"/><circle cx="140" cy="113" r="78" stroke="#3c5230" stroke-dasharray="2 7"/>' + paths + '<text x="114" y="215" fill="#809a67" font-size="10" font-family="monospace">AMPLITUDE</text>' + end;
}

function selectConcept(index, focus = false) {
  const concept = concepts[index];
  $$('#concept-tabs button').forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
  $('#concept-panel').setAttribute('aria-labelledby', `concept-${index}`);
  $('#concept-tag').textContent = concept.tag;
  $('#concept-title').textContent = concept.title;
  $('#concept-description').textContent = concept.text;
  $('#concept-equation').textContent = concept.equation;
  $('#concept-diagram').innerHTML = diagram(concept.type);
  if (focus) $(`#concept-${index}`).focus();
}
$('#concept-tabs').innerHTML = concepts.map((concept, i) => `<button id="concept-${i}" role="tab" aria-selected="${i === 0}" aria-controls="concept-panel" tabindex="${i ? '-1' : '0'}" data-concept="${i}">${escapeHTML(concept.title)}</button>`).join('');
$('#concept-tabs').addEventListener('click', event => { const button = event.target.closest('[data-concept]'); if (button) selectConcept(Number(button.dataset.concept)); });
function handleTabKeys(event, buttons, activate) {
  const current = buttons.indexOf(document.activeElement);
  if (current < 0) return;
  let next;
  if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (current + 1) % buttons.length;
  else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (current - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  if (next !== undefined) { event.preventDefault(); activate(next); buttons[next].focus(); }
}
$('#concept-tabs').addEventListener('keydown', event => handleTabKeys(event, $$('#concept-tabs button'), selectConcept));
selectConcept(0);

const icons = {
  chip: '<rect x="9" y="9" width="22" height="22" rx="3"/><rect x="15" y="15" width="10" height="10" rx="1"/><path d="M14 3v6m6-6v6m6-6v6M14 31v6m6-6v6m6-6v6M3 14h6m-6 6h6m-6 6h6m22-12h6m-6 6h6m-6 6h6"/>',
  laser: '<path d="M4 27L26 5l9 9-22 22zM20 11l9 9M8 31l5 5M29 5l6-4M35 11l4-1M24 3l2-3"/><path d="M6 19l13 13M4 15l21 21" opacity=".5"/>',
  medical: '<path d="M16 6h8v10h10v8H24v10h-8V24H6v-8h10z"/><circle cx="20" cy="20" r="18" opacity=".25"/>',
  clock: '<circle cx="20" cy="20" r="15"/><path d="M20 9v12l7 4M20 2v3m0 30v3M2 20h3m30 0h3"/><circle cx="20" cy="20" r="2"/>',
  sensor: '<circle cx="20" cy="20" r="3"/><path d="M13 13a10 10 0 000 14m14-14a10 10 0 010 14M8 8a17 17 0 000 24m24-24a17 17 0 010 24M20 26v11"/>',
  network: '<circle cx="20" cy="7" r="4"/><circle cx="7" cy="30" r="4"/><circle cx="33" cy="30" r="4"/><path d="M18 11L9 26m13-15 9 15M11 30h18M20 16v8m-4-4h8"/>',
  molecule: '<path d="M12 11l15 5M10 15l2 14m5 2 11-9"/><circle cx="9" cy="9" r="5"/><circle cx="32" cy="18" r="6"/><circle cx="14" cy="33" r="5"/>',
  drug: '<path d="M9 31a8 8 0 010-11L21 8a8 8 0 0111 11L20 31a8 8 0 01-11 0zM15 14l11 11"/><path d="M25 10l4 4" opacity=".5"/>',
  battery: '<rect x="7" y="10" width="28" height="23" rx="3"/><path d="M16 6h10v4M19 15l-5 9h6l-1 5 8-10h-7z"/>',
  route: '<circle cx="8" cy="8" r="4"/><circle cx="32" cy="32" r="4"/><path d="M12 8h14a6 6 0 010 12H14a6 6 0 000 12h14"/>',
  finance: '<path d="M5 34h31M10 28V18m9 10V12m9 16V7M6 12l10-5 8 1 9-6"/>',
  ai: '<path d="M13 9a5 5 0 0110-1 5 5 0 017 6 6 6 0 014 10 6 6 0 01-7 8 5 5 0 01-7 4 5 5 0 01-7-3 6 6 0 01-7-8 6 6 0 010-10 5 5 0 017-6zM20 8v27M12 14l8 5 8-4M12 26l8-7 8 8"/>',
  climate: '<path d="M31 7C8 7 4 20 13 28s21 0 18-21zM11 32l15-18M18 24v-8m0 8 8-1"/>',
  space: '<circle cx="20" cy="20" r="7"/><ellipse cx="20" cy="20" rx="20" ry="7" transform="rotate(-35 20 20)"/><path d="M6 5v7M2 8h8m23 21v7m-4-4h8"/>',
  shield: '<path d="M20 3l14 6v11c0 8-14 17-14 17S6 28 6 20V9zM13 20l5 5 10-11"/>',
};
const icon = name => `<svg class="app-icon" viewBox="0 0 40 40" aria-hidden="true">${icons[name] || icons.molecule}</svg>`;
const applications = [
  { title: 'Semiconductors & electronics', category: 'established', icon: 'chip', sector: 'THE DIGITAL WORLD', text: 'The quantum physics behind transistors, integrated circuits, and the electronics we use every day.', source: 'Band theory, transistors, integrated circuits, tunneling devices.', caution: 'These are established applications of quantum mechanics. Their success is distinct from claims about quantum computing speedups.' },
  { title: 'Medical imaging', category: 'established', icon: 'medical', sector: 'HEALTH & MEDICINE', text: 'Nuclear spin physics makes MRI and NMR possible, helping us see beneath the surface.', source: 'MRI and NMR rely on nuclear spin physics; quantum sensing may enable new modalities.', caution: 'MRI is an established quantum technology. New imaging approaches using quantum sensors have different levels of maturity.' },
  { title: 'Chemistry & catalysis', category: 'research', icon: 'molecule', sector: 'MOLECULAR DISCOVERY', text: 'Simulating molecules and reaction mechanisms to investigate catalysts and complex chemistry.', source: 'Electronic structure, reaction mechanisms, catalyst design; fault-tolerant scale likely needed for hard instances.', caution: 'Useful advantage on difficult chemistry problems requires strong classical comparisons and may need large, fault-tolerant quantum computers.' },
  { title: 'Quantum sensing', category: 'emerging', icon: 'sensor', sector: 'PRECISION & MEASUREMENT', text: 'Measuring magnetic fields, gravity, and motion with the sensitivity of quantum systems.', source: 'Magnetometry, gravimetry, geophysics, material inspection, brain-field measurement.', caution: 'Maturity: commercial niches and research. System performance depends on calibration, packaging, environment, and field robustness.' },
  { title: 'Quantum communications', category: 'emerging', icon: 'network', sector: 'CONNECTED QUANTUM SYSTEMS', text: 'Distributing quantum states and exploring new ways to share cryptographic keys.', source: 'QKD, entanglement distribution, trusted-node links; not a replacement for all security.', caution: 'Maturity: field trials and deployment niches. QKD requires authenticated classical communication and explicit device and trust assumptions.' },
  { title: 'Materials & batteries', category: 'research', icon: 'battery', sector: 'ENERGY & NEW MATERIALS', text: 'Investigating strongly correlated materials, superconductors, and the chemistry of better batteries.', source: 'Strong correlation, superconductors, electrolytes, electrode chemistry.', caution: 'These are research directions. Practical benefit depends on algorithm resources, hardware quality, and the best available classical methods.' },
  { title: 'Photonics & lasers', category: 'established', icon: 'laser', sector: 'LIGHT & INFORMATION', text: 'From LEDs to optical communication, quantum physics puts light to work.', source: 'Lasers, optical communications, imaging, LEDs.', caution: 'These technologies are widely established; emerging photonic quantum computers involve additional technical challenges.' },
  { title: 'Atomic clocks & navigation', category: 'established', icon: 'clock', sector: 'TIME & POSITION', text: 'Atomic transitions set precise time standards and support the timing behind GPS.', source: 'GPS timing, frequency standards; optical clocks and inertial navigation research.', caution: 'Maturity: established and expanding. GPS timing is established; optical clocks and some quantum inertial navigation systems remain research or developing technologies.' },
  { title: 'Drug discovery', category: 'research', icon: 'drug', sector: 'MOLECULES & MEDICINE', text: 'Exploring molecular simulation as one part of future pharmaceutical discovery workflows.', source: 'Molecular simulation and chemistry workflows; no general clinical breakthrough attributable to quantum computing.', caution: 'The source identifies this as research. Quantum computing has not established a general clinical breakthrough in drug discovery.' },
  { title: 'Optimization & logistics', category: 'research', icon: 'route', sector: 'ROUTING & PLANNING', text: 'Testing quantum approaches to routing, scheduling, and combinatorial decisions.', source: 'Routing, scheduling, portfolios; benchmark against advanced classical solvers.', caution: 'Maturity: exploratory. General optimization superiority is not established; end-to-end comparisons with advanced classical solvers are essential.' },
  { title: 'Finance', category: 'research', icon: 'finance', sector: 'ESTIMATION & RISK', text: 'Investigating amplitude estimation and potential Monte Carlo acceleration for risk analysis.', source: 'Monte Carlo acceleration, derivatives and risk; quantum resource requirements remain significant.', caution: 'Maturity: exploratory. Algorithmic speedups depend on data access assumptions, resource requirements, and full workflow costs.' },
  { title: 'Artificial intelligence & ML', category: 'research', icon: 'ai', sector: 'LEARNING & QUANTUM DATA', text: 'Researching quantum feature maps, kernels, and learning models for selected problems.', source: 'Quantum feature maps and learning; no general-purpose advantage demonstrated.', caution: 'Maturity: exploratory. Data loading, trainability, and strong classical benchmarks constrain near-term value.' },
  { title: 'Climate & energy', category: 'research', icon: 'climate', sector: 'A CHANGING PLANET', text: 'Exploring new materials, sensor networks, and energy technologies informed by quantum science.', source: 'New materials, sensor networks, energy systems; avoid assuming faster climate simulation.', caution: 'Maturity: indirect and research. Quantum methods do not imply a general speedup for climate simulations.' },
  { title: 'Space & aerospace', category: 'research', icon: 'space', sector: 'BEYOND THE HORIZON', text: 'Studying atomic inertial sensors, space communication, and navigation without GNSS.', source: 'Atomic inertial sensors, gravimeters, timing, space QKD, navigation without GNSS.', caution: 'Maturity: research and selected sensing. Practical deployment depends on robustness, integration, and mission constraints.' },
  { title: 'Defense & cybersecurity', category: 'emerging', icon: 'shield', sector: 'RESILIENT SYSTEMS', text: 'Preparing cryptographic systems for quantum threats while exploring sensing and secure networks.', source: 'PQC migration is actionable now; sensing and networks have security implications.', caution: 'Maturity: operational planning and research. Post-quantum cryptography runs on classical computers; it differs from quantum key distribution.' },
];
let activeFilter = 'all';
let expandedApplications = false;
function renderApplications() {
  const matching = applications.filter(app => activeFilter === 'all' || app.category === activeFilter);
  const visible = expandedApplications || activeFilter !== 'all' ? matching : matching.slice(0, 6);
  $('#application-grid').innerHTML = visible.map(app => `<button class="application-card" data-app="${applications.indexOf(app)}" aria-label="Explore ${escapeHTML(app.title)}"><span class="card-top">${icon(app.icon)}<span class="status ${app.category}">${app.category === 'research' ? 'Research' : app.category === 'emerging' ? 'Emerging' : 'Established'}</span></span><h3>${escapeHTML(app.title)}</h3><p>${escapeHTML(app.text)}</p><span class="card-bottom">${app.sector}<span class="card-arrow" aria-hidden="true">↗</span></span></button>`).join('');
  $('#application-count').textContent = `${String(visible.length).padStart(2, '0')} / ${String(matching.length).padStart(2, '0')} APPLICATIONS`;
  const more = $('#more-applications');
  more.hidden = activeFilter !== 'all';
  more.innerHTML = expandedApplications ? 'Show featured applications <span aria-hidden="true">↑</span>' : 'Explore all 15 applications <span aria-hidden="true">↓</span>';
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  $$('[data-filter]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
  renderApplications();
}));
$('#more-applications').addEventListener('click', () => { expandedApplications = !expandedApplications; renderApplications(); if (!expandedApplications) $('#applications').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); });
function openApplication(index) {
  if (!Number.isInteger(index) || !applications[index]) return;
  const app = applications[index];
  $('#application-dialog-content').innerHTML = `${icon(app.icon)}<div><span class="status ${app.category}">${app.category}</span></div><h2 id="application-dialog-title">${escapeHTML(app.title)}</h2><p>${escapeHTML(app.text)}</p><p>${escapeHTML(app.source)}</p><p class="detail-caution">${escapeHTML(app.caution)}</p><div class="application-dialog-actions"><button class="button primary" data-launch-sim="${app.icon === 'chip' ? 'tunnel' : ['network', 'shield'].includes(app.icon) ? 'bell' : ['sensor', 'laser', 'clock', 'space'].includes(app.icon) ? 'slit' : 'qubit'}">Launch a related simulation <span aria-hidden="true">↗</span></button><button class="text-link" data-chapter="8">Read the applications chapter ↗</button></div><div class="application-frontier-links"><span>FOLLOW THIS APPLICATION</span><button class="text-link" data-news-app="${index}">Related news & research ↗</button><button class="text-link" data-atlas-app="${index}">Companies exploring this ↗</button><button class="text-link" data-toolkit-app="${index}">Related tools & techniques ↗</button><button class="text-link" data-innovators-app="${index}">People & projects in this field ↗</button><button class="text-link" data-universe-select="application:${index}">See it in the quantum universe ↗</button></div>`;
  $('#application-dialog').showModal();
}
$('#application-grid').addEventListener('click', event => { const button = event.target.closest('[data-app]'); if (button) openApplication(Number(button.dataset.app)); });
document.addEventListener('quantum:application', event => openApplication(event.detail.index));
renderApplications();

const evolution = initEvolution({ document, window });
initUniverse({ document, window, evolutionReady: evolution.ready });
document.addEventListener('quantum:concept', event => { const index = Number(event.detail?.index); if (Number.isInteger(index) && concepts[index]) { selectConcept(index, true); $('#foundations').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); } });

initSimulations({ document, window });
initInnovators({ document, window });
initFrontier({ document, window });
initToolkit({ document, window });

let guidePromise, guide, selectedChapter = 0;
async function loadGuide() {
  if (!guidePromise) guidePromise = fetch('/content/guide.json').then(response => { if (!response.ok) throw new Error('Guide unavailable'); return response.json(); }).then(data => { guide = data; return data; }).catch(error => { guidePromise = null; throw error; });
  return guidePromise;
}
const chapterText = chapter => chapter.blocks.map(block => block.type === 'table' ? block.rows.map(row => row.join(' ')).join(' ') : block.text).join(' ');
function linkify(text) {
  return escapeHTML(text).replace(/https?:\/\/[^\s<>]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
function renderBlocks(blocks) {
  return blocks.map(block => {
    if (block.type === 'table') return `<div class="table-wrap"><table><thead><tr>${block.rows[0].map(cell => `<th scope="col">${escapeHTML(cell)}</th>`).join('')}</tr></thead><tbody>${block.rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${linkify(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const isHeading = block.text.length < 90 && !/[.!?;:]$/.test(block.text) && !block.text.startsWith('“') && !block.text.includes('http');
    return `<p${isHeading ? ' class="block-heading"' : ''}>${linkify(block.text)}</p>`;
  }).join('');
}
function renderChapterNav() {
  $('#chapter-nav').innerHTML = `<button data-reader-chapter="0" class="${selectedChapter === 0 ? 'active' : ''}" ${selectedChapter === 0 ? 'aria-current="page"' : ''}><span>00</span>Overview</button>` + guide.chapters.map(chapter => `<button data-reader-chapter="${chapter.id}" class="${selectedChapter === chapter.id ? 'active' : ''}" ${selectedChapter === chapter.id ? 'aria-current="page"' : ''}><span>${String(chapter.id).padStart(2, '0')}</span>${escapeHTML(chapter.title)}</button>`).join('');
}
function renderChapter(id) {
  selectedChapter = id;
  $('#guide-search').value = '';
  renderChapterNav();
  const chapter = guide.chapters.find(item => item.id === id);
  const title = id === 0 ? 'A field guide to the quantum world' : chapter.title;
  const intro = guide.intro.filter(block => !['QUANTUM', guide.subtitle].includes(block.text));
  $('#guide-article').innerHTML = `<div class="chapter-label">${id === 0 ? 'OVERVIEW / OCTOBER 2026 EDITION' : `CHAPTER ${String(id).padStart(2, '0')} / 19`}</div><h2>${escapeHTML(title)}</h2>${renderBlocks(id === 0 ? intro : chapter.blocks)}<div class="chapter-pagination">${id > 0 ? `<button data-reader-chapter="${id - 1}">← Previous chapter</button>` : '<span></span>'}${id < 19 ? `<button data-reader-chapter="${id + 1}">Next chapter →</button>` : '<a href="/quantum-comprehensive-guide.docx" download>Download the complete guide ↓</a>'}</div>`;
  $('#guide-article').scrollTop = 0;
  const active = $('#chapter-nav .active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
async function openGuide(id = 0) {
  $('#application-dialog').close();
  const dialog = $('#guide-dialog');
  if (!dialog.open) dialog.showModal();
  $('#guide-article').innerHTML = '<p class="reader-status">Opening the field guide…</p>';
  try { await loadGuide(); renderChapter(id); }
  catch { $('#guide-article').innerHTML = '<p>The reader could not load. Please try again or <a href="/quantum-comprehensive-guide.docx" download>download the complete handbook</a>.</p>'; }
}
document.addEventListener('click', event => {
  const guideButton = event.target.closest('[data-guide]');
  const chapterButton = event.target.closest('[data-chapter]');
  const readerButton = event.target.closest('[data-reader-chapter]');
  if (guideButton) openGuide();
  else if (chapterButton) openGuide(Number(chapterButton.dataset.chapter));
  else if (readerButton && guide) renderChapter(Number(readerButton.dataset.readerChapter));
});
$$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }));
function highlight(text, query) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index === -1) return escapeHTML(text);
  return escapeHTML(text.slice(0, index)) + '<mark>' + escapeHTML(text.slice(index, index + query.length)) + '</mark>' + escapeHTML(text.slice(index + query.length));
}
$('#guide-search').addEventListener('input', () => {
  if (!guide) return;
  const query = $('#guide-search').value.trim();
  if (!query) { renderChapter(selectedChapter); return; }
  const results = guide.chapters.map(chapter => ({ chapter, text: chapterText(chapter) })).filter(({ chapter, text }) => `${chapter.title} ${text}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  $('#guide-article').innerHTML = `<div class="chapter-label">SEARCH THE FIELD GUIDE</div><h2>${results.length} ${results.length === 1 ? 'chapter' : 'chapters'} found</h2>` + (results.length ? results.map(({ chapter, text }) => {
    const index = Math.max(0, text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()));
    const start = Math.max(0, index - 55);
    const excerpt = (start ? '…' : '') + text.slice(start, start + Math.max(180, query.length + 70)) + '…';
    return `<button class="search-result" data-reader-chapter="${chapter.id}"><h3>${String(chapter.id).padStart(2, '0')} / ${highlight(chapter.title, query)}</h3><p>${highlight(excerpt, query)}</p></button>`;
  }).join('') : `<p>No chapters match “${escapeHTML(query)}”. Try “entanglement”, “sensing”, or “error correction”.</p>`);
  $('#guide-article').scrollTop = 0;
});

$('.menu-button').addEventListener('click', () => {
  const open = $('.menu-button').getAttribute('aria-expanded') !== 'true';
  $('.menu-button').setAttribute('aria-expanded', String(open));
  $('.menu-button').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  $('#main-nav').classList.toggle('open', open);
});
$$('#main-nav a').forEach(link => link.addEventListener('click', () => { $('.menu-button').setAttribute('aria-expanded', 'false'); $('.menu-button').setAttribute('aria-label', 'Open navigation'); $('#main-nav').classList.remove('open'); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#main-nav').classList.contains('open')) { $('.menu-button').click(); $('.menu-button').focus(); } });
addEventListener('scroll', () => { const height = document.documentElement.scrollHeight - innerHeight; $('.reading-progress').style.width = `${height > 0 ? scrollY / height * 100 : 0}%`; }, { passive: true });
const sectionObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) $$('#main-nav a').forEach(link => link.classList.toggle('current', link.hash === `#${entry.target.id}`)); }, { rootMargin: '-15% 0px -60% 0px' });
$$('main section[id]').forEach(section => sectionObserver.observe(section));

// Interactive concept art. Scientific calculations live in the simulation deck.
function initQuantumCloud() {
  const canvas = $('#quantum-canvas'), ctx = canvas.getContext('2d');
  let mode = 'cloud', energy = .6, paused = reducedMotion, width = 0, height = 0;
  let visible = true, frameId = 0, lastTime = 0, elapsed = 0, lastDraw = 0;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const particles = Array.from({ length: 1600 }, (_, i) => {
    const y = 1 - i / 1599 * 2, r = Math.sqrt(1 - y * y), phi = Math.PI * (3 - Math.sqrt(5)) * i;
    return { x: Math.cos(phi) * r, y, z: Math.sin(phi) * r, offset: (Math.sin(i * 42.13) + 1) / 2 };
  });
  const modes = { cloud: ['PROBABILITY CLOUD', '01 / 03'], wave: ['INTERFERENCE FIELD', '02 / 03'], network: ['CORRELATED SYSTEMS', '03 / 03'] };
  function syncControls() {
    $$('[data-visual]').forEach(button => { const selected = button.dataset.visual === mode; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    $('#hero-mode-label').textContent = modes[mode][0]; $('#hero-mode-index').textContent = modes[mode][1];
    $('#hero-motion').setAttribute('aria-pressed', String(paused)); $('#hero-motion').setAttribute('aria-label', paused ? 'Play the ambient visualization' : 'Pause the ambient visualization'); $('#hero-motion').textContent = paused ? '▶' : 'Ⅱ';
    $('#visual-energy-output').textContent = `${Math.round(energy * 100)}%`;
    canvas.setAttribute('aria-label', `Interactive concept art: ${modes[mode][0].toLowerCase()}. Visual energy ${Math.round(energy * 100)} percent. Use the mode and energy controls to change the artwork.`);
  }
  function draw() {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const mobile = innerWidth <= 520, cx = width * (mobile ? .5 : .56), cy = height * .45;
    const radius = Math.min(width * .35, height * .32), t = elapsed * .00012;
    pointerX += (targetX - pointerX) * .1; pointerY += (targetY - pointerY) * .1;
    const spin = t + pointerX * .7, tilt = -.18 + pointerY * .36;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.65);
    glow.addColorStop(0, mode === 'wave' ? '#3c95951c' : '#799f2320'); glow.addColorStop(.45, '#56761c0d'); glow.addColorStop(1, '#799f2300');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = `rgba(168,190,155,${.12 + (Math.sin(i * 17.1) + 1) * .1})`;
      ctx.fillRect(((Math.sin(i * 471.9) + 1) / 2) * width, ((Math.cos(i * 798.3) + 1) / 2) * height, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
    }
    const projected = particles.map((p, i) => {
      let px = p.x, py = p.y, pz = p.z;
      if (mode === 'wave') {
        px = (i % 80 / 79 * 2 - 1) * 1.25; pz = (Math.floor(i / 80) / 19 * 2 - 1) * .8;
        py = Math.sin(px * (4 + energy * 3) - t * 3) * (.2 + energy * .35) + Math.cos(pz * 5 + t) * .12;
      } else if (mode === 'network') {
        px = p.x * .5 + (i % 2 ? -.67 : .67); py = p.y * .5; pz = p.z * .5;
      }
      const deformation = 1 + (.025 + energy * .08) * Math.sin(py * 13 + t * 2) * Math.cos(pz * 8 - t);
      const x = (px * Math.cos(spin) + pz * Math.sin(spin)) * deformation;
      const z = -px * Math.sin(spin) + pz * Math.cos(spin);
      const y = py * Math.cos(tilt) - z * Math.sin(tilt), rz = py * Math.sin(tilt) + z * Math.cos(tilt), perspective = 3.8 / (3.8 - rz);
      return { x: cx + x * radius * perspective, y: cy + y * radius * perspective, z: rz, s: .4 + p.offset * (.6 + energy * .7), i };
    }).sort((a, b) => a.z - b.z);
    ctx.globalCompositeOperation = 'screen';
    projected.forEach(p => {
      const opacity = Math.max(.12, .15 + (p.z + 1) * .31), size = p.s * (.8 + (p.z + 1) * .3);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.2, size), 0, Math.PI * 2);
      ctx.fillStyle = mode === 'wave' || (mode === 'network' && p.i % 2) ? `rgba(128,228,231,${opacity})` : p.i % 9 === 0 ? `rgba(231,250,195,${opacity})` : `rgba(168,216,80,${opacity})`;
      ctx.fill();
      if (p.z > .5 && p.i % 23 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2); ctx.fillStyle = '#c5f27709'; ctx.fill(); }
    });
    if (mode === 'network') {
      for (let i = 0; i < 8; i++) {
        const y = cy + Math.sin(i * .7 + t) * radius * .4;
        ctx.beginPath(); ctx.moveTo(cx - radius * .45, y); ctx.bezierCurveTo(cx - radius * .1, cy - radius * .3, cx + radius * .1, cy + radius * .3, cx + radius * .45, y);
        ctx.strokeStyle = '#80e4e719'; ctx.lineWidth = .6; ctx.stroke();
      }
    }
    for (let ring = 0; ring < 3; ring++) {
      const rotation = [-.5, .7, -.1][ring] + pointerX * .13;
      const rx = radius * [1.55, 1.4, 1.2][ring], ry = radius * [.4, .49, .87][ring];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.strokeStyle = ['#a4ce704d', '#80e4e732', '#a4ce7018'][ring]; ctx.lineWidth = .7; ctx.stroke();
      const position = t * (ring + 1) * .6 + ring * 2, px = Math.cos(position) * rx, py = Math.sin(position) * ry;
      ctx.beginPath(); ctx.arc(px, py, ring === 0 ? 3 : 2, 0, Math.PI * 2); ctx.fillStyle = ring === 1 ? '#80e4e7' : '#d7fca3'; ctx.shadowColor = '#bdec73'; ctx.shadowBlur = 16; ctx.fill(); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#6d855a60'; ctx.lineWidth = .7;
    for (const [x, y] of [[cx - radius * 1.3, cy - radius * .9], [cx + radius * 1.3, cy + radius * .9]]) { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  function loop(time) {
    frameId = 0;
    if (!visible || document.hidden || paused || !ctx) { lastTime = 0; return; }
    const dt = lastTime ? Math.min(time - lastTime, 80) : 0; lastTime = time; elapsed += dt * (.35 + energy * 1.5);
    if (time - lastDraw > 32) { draw(); lastDraw = time; }
    frameId = requestAnimationFrame(loop);
  }
  function resume() { if (!paused && visible && !document.hidden && !frameId && ctx) frameId = requestAnimationFrame(loop); }
  function pauseFrame() { if (frameId) cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; }
  $$('[data-visual]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.visual; syncControls(); draw(); }));
  $('#visual-energy').addEventListener('input', () => { energy = Number($('#visual-energy').value) / 100; syncControls(); draw(); });
  $('#hero-motion').addEventListener('click', () => { paused = !paused; syncControls(); if (paused) pauseFrame(); else resume(); });
  $('.hero-visual').addEventListener('pointermove', event => { if (event.pointerType === 'touch') return; const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return; targetX = (event.clientX - rect.left) / rect.width * 2 - 1; targetY = (event.clientY - rect.top) / rect.height * 2 - 1; if (paused) { pointerX = targetX; pointerY = targetY; draw(); } });
  $('.hero-visual').addEventListener('pointerleave', () => { targetX = targetY = 0; if (paused) { pointerX = pointerY = 0; draw(); } });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) pauseFrame(); resume(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFrame(); else resume(); });
  syncControls(); resize(); resume();
}
initQuantumCloud();
