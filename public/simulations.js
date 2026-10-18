import { blochVector, qubitProbability, applyGate, slitIntensity, slitDistribution, bellProbabilities, expectedCHSH, transmission, sampleDistribution, radians } from './physics.js';

export function initSimulations({ document, window }) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const number = id => Number($(id).value);
  const percent = value => `${(value * 100).toFixed(1)}%`;
  const angle = value => `${Number(value.toFixed(1))}°`;
  const random = () => window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 'qubit', labVisible = true, frame = 0, lastTime = 0, elapsed = 0;
  const names = { qubit: 'Qubit studio', slit: 'Double-slit chamber', bell: 'Entanglement experiment', tunnel: 'Tunneling chamber' };
  const qubit = { theta: 90, phi: 0, noise: 0, basis: 'Z', shots: 0, zeroes: 0, ones: 0, recent: [], history: [] };
  const slit = { wavelength: 550, separation: 5, whichPath: false, count: 0, hits: [], bins: new Array(241).fill(0), running: false, remainder: 0 };
  const bell = { alice: 0, bob: 22.5, noise: 0, counts: [0, 0, 0, 0], chsh: null };
  const tunnel = { energy: 1, height: 1.5, width: 1.2, transmitted: 0, reflected: 0, particles: [], running: false, remainder: 0 };
  const inertState = new Map();

  function status(text) { $('#experiment-status').textContent = text; }
  function syncExport() {
    $('#export-experiment').disabled = !({ qubit: qubit.shots, slit: slit.count, bell: bell.counts.reduce((a, b) => a + b, 0) || bell.chsh, tunnel: tunnel.transmitted + tunnel.reflected }[active]);
  }
  function selectSimulation(name, focus = false) {
    if (!names[name]) return;
    active = name;
    $$('[data-simulation]').forEach(button => { const selected = button.dataset.simulation === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
    $$('.simulation-panel').forEach(panel => { panel.hidden = panel.id !== `simulation-${name}`; });
    if (name !== 'slit') setSlitRunning(false);
    if (name !== 'tunnel') setTunnelRunning(false);
    if (focus) $(`#tab-${name}`).focus();
    status(`${names[name]} ready`); syncExport(); draw(); resume();
  }
  $$('[data-simulation]').forEach(button => button.addEventListener('click', () => selectSimulation(button.dataset.simulation)));
  $('.simulation-tabs').addEventListener('keydown', event => {
    const tabs = $$('[data-simulation]'), current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let next;
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (current + 1) % tabs.length;
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectSimulation(tabs[next].dataset.simulation, true); }
  });
  document.addEventListener('click', event => {
    const launch = event.target.closest('[data-launch-sim]');
    if (!launch) return;
    const dialog = launch.closest('dialog'); if (dialog) dialog.close();
    $('.menu-button').setAttribute('aria-expanded', 'false'); $('.menu-button').setAttribute('aria-label', 'Open navigation'); $('#main-nav').classList.remove('open');
    selectSimulation(launch.dataset.launchSim, true);
    $('#quantum-lab').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  });
  function setFocus(enabled) {
    $('#simulation-workbench').classList.toggle('lab-focus', enabled);
    $('#simulation-workbench').setAttribute('role', enabled ? 'dialog' : 'region');
    if (enabled) {
      $('#simulation-workbench').setAttribute('aria-modal', 'true');
      let node = $('#simulation-workbench');
      while (node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling === node || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) continue;
          if (!inertState.has(sibling)) inertState.set(sibling, sibling.inert);
          sibling.inert = true;
        }
        node = node.parentElement;
        if (node === document.body) break;
      }
    } else {
      $('#simulation-workbench').removeAttribute('aria-modal');
      for (const [element, wasInert] of inertState) element.inert = wasInert;
      inertState.clear();
    }
    document.body.classList.toggle('lab-is-expanded', enabled);
    $('#lab-focus').setAttribute('aria-pressed', String(enabled));
    $('#lab-focus').textContent = enabled ? 'Exit focus view ×' : 'Expand lab ⛶';
    if (!enabled) $('#lab-focus').focus();
  }
  $('#lab-focus').addEventListener('click', () => setFocus($('#lab-focus').getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#simulation-workbench').classList.contains('lab-focus')) { setFocus(false); event.preventDefault(); } });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !$('#simulation-workbench').classList.contains('lab-focus')) return;
    const controls = [...$('#simulation-workbench').querySelectorAll('button:not([disabled]),input,a[href]')].filter(element => !element.closest('[hidden]') && element.tabIndex !== -1);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  });

  function clearQubitShots() {
    qubit.shots = qubit.zeroes = qubit.ones = 0; qubit.recent = [];
    $('#measurement-results').innerHTML = '<span class="mono">AWAITING MEASUREMENT</span><p>Each shot samples a freshly prepared state. Results vary; probabilities stay the same.</p>';
    $('#shot-strip').innerHTML = ''; syncExport();
  }
  function renderQubit() {
    const { theta, phi, noise, basis } = qubit;
    $('#theta').value = theta; $('#phi').value = phi; $('#qubit-noise').value = noise * 100;
    $('#theta-output').textContent = angle(theta); $('#phi-output').textContent = angle(phi); $('#qubit-noise-output').textContent = `${Math.round(noise * 100)}%`;
    const alpha = Math.cos(radians(theta) / 2), beta = Math.sin(radians(theta) / 2);
    const state = `${alpha.toFixed(3)}|0⟩ + ${phi > .01 ? `e^(i${angle(phi)}) ` : ''}${beta.toFixed(3)}|1⟩`;
    $('#state-equation').textContent = noise ? `ρ = ${Number((1 - noise).toFixed(2))}|ψ⟩⟨ψ| + ${Number(noise.toFixed(2))}I/2` : `|ψ⟩ = ${state}`;
    $('#qubit-state-type').textContent = noise ? 'MIXED STATE' : 'PURE STATE';
    $('#qubit-state-caption').textContent = noise ? `Prepared |ψ⟩ = ${state}. White noise shortens its Bloch vector to ${(1 - noise).toFixed(2)}.` : 'A pure state on the surface. Add noise to move inside the sphere.';
    const vector = blochVector(theta, phi, noise);
    for (const axis of ['x', 'y', 'z']) $(`#bloch-${axis}`).textContent = (Math.abs(vector[axis]) < .0001 ? 0 : vector[axis]).toFixed(2);
    // Oblique projection of x, y, z onto the existing SVG sphere.
    const x = 150 + 89 * (Math.sqrt(3) / 2 * vector.x + .5 * vector.y);
    const y = 130 - 89 * vector.z;
    $('#state-vector').setAttribute('d', `M150 130L${x} ${y}`);
    $('#state-projection').setAttribute('d', `M${x} ${y}L${x} 130L150 130`);
    for (const id of ['#state-point', '#state-point-halo']) { $(id).setAttribute('cx', x); $(id).setAttribute('cy', y); }
    const p0 = qubitProbability(theta, phi, noise, basis), rounded = Math.round(p0 * 100);
    const labels = { Z: ['|0⟩', '|1⟩'], X: ['|+⟩', '|−⟩'], Y: ['|+i⟩', '|−i⟩'] }[basis];
    $('#qubit-label-zero').firstChild.textContent = `${labels[0]} `; $('#qubit-label-one').firstChild.textContent = `${labels[1]} `;
    $('#p-zero').textContent = `${rounded}%`; $('#p-one').textContent = `${100 - rounded}%`; $('#probability-fill').style.width = `${p0 * 100}%`;
    $('#bloch-sphere').setAttribute('aria-label', `Bloch sphere: theta ${angle(theta)}, phase ${angle(phi)}, noise ${Math.round(noise * 100)}%. ${basis}-basis positive outcome ${percent(p0)}.`);
    $$('[data-state]').forEach(button => { const selected = Math.abs(Number(button.dataset.state) - theta) < .01 && (theta !== 90 || phi < .01) && !noise; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    $$('[data-basis]').forEach(button => { const selected = button.dataset.basis === basis; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    $('#gate-history').textContent = qubit.history.length ? `Gate sequence: ${qubit.history.map(item => item.gate).join(' → ')}` : 'Gate sequence: ready for your first operation';
    $('#undo-gate').disabled = !qubit.history.length;
  }
  for (const id of ['#theta', '#phi', '#qubit-noise']) $(id).addEventListener('input', () => {
    qubit.theta = number('#theta'); qubit.phi = number('#phi'); qubit.noise = number('#qubit-noise') / 100; qubit.history = [];
    clearQubitShots(); renderQubit(); status('State updated · measurements cleared');
  });
  $$('[data-state]').forEach(button => button.addEventListener('click', () => { qubit.theta = Number(button.dataset.state); qubit.phi = qubit.noise = 0; qubit.history = []; clearQubitShots(); renderQubit(); }));
  $$('[data-basis]').forEach(button => button.addEventListener('click', () => { qubit.basis = button.dataset.basis; clearQubitShots(); renderQubit(); status(`Measurement basis: ${qubit.basis}`); }));
  $$('[data-gate]').forEach(button => button.addEventListener('click', () => {
    if (qubit.history.length >= 24) { status('24 gates reached · undo or reset to start a new sequence'); return; }
    const gate = button.dataset.gate;
    qubit.history.push({ gate, theta: qubit.theta, phi: qubit.phi });
    Object.assign(qubit, applyGate(qubit.theta, qubit.phi, gate)); clearQubitShots(); renderQubit(); status(`${gate} gate applied`);
  }));
  $('#undo-gate').addEventListener('click', () => { const previous = qubit.history.pop(); if (!previous) return; qubit.theta = previous.theta; qubit.phi = previous.phi; clearQubitShots(); renderQubit(); status('Last gate undone'); });
  function measureQubit() {
    const p = qubitProbability(qubit.theta, qubit.phi, qubit.noise, qubit.basis);
    const values = window.crypto.getRandomValues(new Uint32Array(100));
    for (const value of values) { const result = value / 4294967296 < p ? 0 : 1; result ? qubit.ones++ : qubit.zeroes++; qubit.recent.push(result); }
    qubit.recent = qubit.recent.slice(-80); qubit.shots += 100;
    const labels = qubit.basis === 'Z' ? ['zero', 'one'] : ['positive', 'negative'];
    $('#measurement-results').innerHTML = `<div class="shot-counts"><span>OUTCOME + <strong>${qubit.zeroes.toLocaleString()}</strong></span><span>OUTCOME − <strong>${qubit.ones.toLocaleString()}</strong></span><span>${qubit.shots.toLocaleString()} shots</span></div><p>Observed: ${(qubit.zeroes / qubit.shots * 100).toFixed(1)}% ${labels[0]} · ${(qubit.ones / qubit.shots * 100).toFixed(1)}% ${labels[1]} (${qubit.basis}-basis outcomes + / −). Every shot starts with a newly prepared state.</p>`;
    $('#shot-strip').innerHTML = qubit.recent.map(value => `<span class="shot ${value ? 'one' : 'zero'}" title="${qubit.basis}-basis outcome ${value ? '−' : '+'}"></span>`).join('');
    $('#shot-strip').setAttribute('aria-label', `Latest ${qubit.recent.length} outcomes: ${qubit.recent.filter(value => !value).length} positive and ${qubit.recent.filter(Boolean).length} negative`);
    syncExport(); status(`${qubit.shots.toLocaleString()} shots sampled in the ${qubit.basis} basis`);
  }
  $('#measure').addEventListener('click', measureQubit);
  $('#reset-lab').addEventListener('click', () => { Object.assign(qubit, { theta: 90, phi: 0, noise: 0, basis: 'Z', history: [] }); clearQubitShots(); renderQubit(); status('Qubit studio reset'); });

  let slitProbabilities = slitDistribution(slit.wavelength, slit.separation, slit.whichPath);
  function setSlitRunning(running) { slit.running = running; $('#slit-toggle').setAttribute('aria-pressed', String(running)); $('#slit-toggle').innerHTML = running ? 'Pause continuous source <span>Ⅱ</span>' : 'Start continuous source <span>▶</span>'; }
  function clearSlit() { slit.count = 0; slit.hits = []; slit.bins.fill(0); slit.remainder = 0; $('#slit-count').textContent = '0'; syncExport(); }
  function updateSlit() {
    slit.wavelength = number('#slit-wavelength'); slit.separation = number('#slit-separation'); slit.whichPath = $('#which-path').checked;
    slitProbabilities = slitDistribution(slit.wavelength, slit.separation, slit.whichPath);
    $('#slit-wavelength-output').textContent = `${slit.wavelength} nm`; $('#slit-separation-output').textContent = `${slit.separation.toFixed(1)} µm`;
    $('#slit-spacing').innerHTML = slit.whichPath ? '—' : `${(slit.wavelength / 1000 * 100 / slit.separation).toFixed(1)} <small>mm</small>`;
    $('#slit-mode-badge').textContent = slit.whichPath ? 'PATH INFORMATION RECORDED' : 'COHERENT PATHS';
    $('#slit-explanation').textContent = slit.whichPath ? 'Recording which-path information removes the interference term. A broad diffraction envelope remains.' : 'Without which-path information, probability amplitudes interfere. Bright and dark fringes emerge.';
    const path = slitProbabilities.map((_, i) => `${i ? 'L' : 'M'}${30 + 550 * i / 240} ${95 - 77 * slitIntensity(-40 + 80 * i / 240, slit.wavelength, slit.separation, slit.whichPath)}`).join(' ');
    $('#slit-curve').setAttribute('d', path);
    $('#slit-plot').setAttribute('aria-label', slit.whichPath ? 'Broad single-slit diffraction envelope with interference removed' : `Interference fringes, spacing ${(slit.wavelength / 1000 * 100 / slit.separation).toFixed(1)} millimeters`);
    setSlitRunning(false); clearSlit(); drawSlit(); status('Optical parameters changed · detections cleared');
  }
  function emitPhotons(count, repaint = true) {
    for (let i = 0; i < count; i++) { const bin = sampleDistribution(slitProbabilities, random); slit.count++; slit.bins[bin]++; slit.hits.push({ bin, x: random(), born: elapsed }); }
    if (slit.hits.length > 3000) slit.hits = slit.hits.slice(-3000);
    $('#slit-count').textContent = slit.count.toLocaleString(); syncExport(); if (repaint) drawSlit();
  }
  for (const id of ['#slit-wavelength', '#slit-separation']) $(id).addEventListener('input', updateSlit);
  $('#which-path').addEventListener('change', updateSlit);
  $('#slit-fire').addEventListener('click', () => { emitPhotons(200); status(`${slit.count.toLocaleString()} photons detected`); });
  $('#slit-toggle').addEventListener('click', () => { setSlitRunning(!slit.running); status(slit.running ? 'Continuous source active · 40 photons per second' : 'Photon source paused'); });
  $('#slit-reset').addEventListener('click', () => { setSlitRunning(false); clearSlit(); drawSlit(); status('Detections cleared'); });

  const bellTotal = () => bell.counts.reduce((a, b) => a + b, 0);
  function renderBell() {
    const probabilities = bellProbabilities(bell.alice, bell.bob, bell.noise), total = bellTotal();
    for (const person of ['alice', 'bob']) {
      $(`#${person}-angle`).value = bell[person]; $(`#${person}-angle-output`).textContent = angle(bell[person]); $(`#${person}-angle-label`).textContent = angle(bell[person]);
      $(`#${person}-analyzer`).setAttribute('transform', `rotate(${bell[person]} ${person === 'alice' ? 120 : 540} 112)`);
    }
    $('#bell-noise').value = bell.noise * 100; $('#bell-noise-output').textContent = `${Math.round(bell.noise * 100)}%`;
    const correlation = probabilities[0] + probabilities[3] - probabilities[1] - probabilities[2];
    $('#bell-correlation').textContent = `${correlation >= 0 ? '+' : ''}${correlation.toFixed(3)}`;
    $('#bell-matches').innerHTML = `${((probabilities[0] + probabilities[3]) * 100).toFixed(1)}<small>%</small>`;
    $('#bell-histogram').innerHTML = probabilities.map((p, i) => {
      const observed = total ? bell.counts[i] / total : p;
      return `<div class="histogram-column"><span class="histogram-value">${percent(observed)}</span><div class="histogram-track"><span style="height:${observed * 100}%"></span><i style="bottom:${p * 100}%" title="Expected ${percent(p)}"></i></div><strong>${['00', '01', '10', '11'][i]}</strong><small>${total ? `${bell.counts[i]} pairs` : 'predicted'}</small></div>`;
    }).join('');
    $('#bell-histogram').setAttribute('aria-label', `${total ? 'Measured' : 'Expected'} joint probabilities: ${probabilities.map((p, i) => `${['00', '01', '10', '11'][i]} ${percent(total ? bell.counts[i] / total : p)}`).join(', ')}`);
    $('#bell-count').textContent = total ? `${total.toLocaleString()} pairs measured. Thin lines mark theoretical probabilities. Match rate: ${percent((bell.counts[0] + bell.counts[3]) / total)}.` : 'No pairs measured. Bars show theoretical probabilities.';
    syncExport();
  }
  function clearBell() { bell.counts = [0, 0, 0, 0]; bell.chsh = null; $('#bell-test-result').innerHTML = '<span class="mono">CHSH / FOUR MEASUREMENT SETTINGS</span><p>Run a Bell test to compare the local-model bound of 2 with a simulated quantum prediction.</p>'; }
  for (const id of ['#alice-angle', '#bob-angle', '#bell-noise']) $(id).addEventListener('input', () => { bell.alice = number('#alice-angle'); bell.bob = number('#bob-angle'); bell.noise = number('#bell-noise') / 100; clearBell(); renderBell(); status('Analyzer settings changed · previous results cleared'); });
  function measureBell() {
    const probabilities = bellProbabilities(bell.alice, bell.bob, bell.noise);
    for (let i = 0; i < 200; i++) bell.counts[sampleDistribution(probabilities, random)]++;
    renderBell(); status(`${bellTotal().toLocaleString()} entangled pairs sampled`);
    $('#simulation-bell').classList.remove('pair-measured'); void $('#simulation-bell').offsetWidth; $('#simulation-bell').classList.add('pair-measured');
  }
  $('#bell-measure').addEventListener('click', measureBell);
  $('#bell-chsh').addEventListener('click', () => {
    const settings = [[0, 22.5], [0, -22.5], [45, 22.5], [45, -22.5]];
    const runs = settings.map(([a, b]) => {
      const counts = [0, 0, 0, 0], probabilities = bellProbabilities(a, b, bell.noise);
      for (let i = 0; i < 300; i++) counts[sampleDistribution(probabilities, random)]++;
      return { alice: a, bob: b, counts, correlation: (counts[0] + counts[3] - counts[1] - counts[2]) / 300 };
    });
    const observed = Math.abs(runs[0].correlation + runs[1].correlation + runs[2].correlation - runs[3].correlation), predicted = expectedCHSH(bell.noise);
    bell.chsh = { settings: runs, observed, predicted, samplesPerSetting: 300 };
    $('#bell-test-result').innerHTML = `<div class="chsh-values"><span>OBSERVED |S| <strong>${observed.toFixed(3)}</strong></span><span>MODEL EXPECTATION <strong>${predicted.toFixed(3)}</strong></span><span>LOCAL-MODEL BOUND <strong>2.000</strong></span></div><p>1,200 pairs across settings (0°, 22.5°), (0°, −22.5°), (45°, 22.5°), (45°, −22.5°). Finite-sample results fluctuate. ${observed > 2 ? 'This simulated run exceeds the local-model bound.' : 'This simulated run does not exceed the local-model bound.'}</p>`;
    syncExport(); status('Four-setting CHSH simulation complete · 1,200 pairs');
  });
  $('#bell-reset').addEventListener('click', () => { Object.assign(bell, { alice: 0, bob: 22.5, noise: 0 }); clearBell(); renderBell(); status('Entanglement experiment reset'); });

  function setTunnelRunning(running) { tunnel.running = running; $('#tunnel-toggle').setAttribute('aria-pressed', String(running)); $('#tunnel-toggle').innerHTML = running ? 'Pause continuous beam <span>Ⅱ</span>' : 'Start continuous beam <span>▶</span>'; }
  function clearTunnel() { tunnel.transmitted = tunnel.reflected = 0; tunnel.particles = []; tunnel.remainder = 0; renderTunnelCounts(); }
  function renderTunnelCounts() { $('#tunnel-transmitted').textContent = tunnel.transmitted.toLocaleString(); $('#tunnel-reflected').textContent = tunnel.reflected.toLocaleString(); $('#tunnel-total').textContent = (tunnel.transmitted + tunnel.reflected).toLocaleString(); syncExport(); }
  function updateTunnel() {
    tunnel.energy = number('#tunnel-energy'); tunnel.height = number('#tunnel-height'); tunnel.width = number('#tunnel-width');
    for (const parameter of ['energy', 'height', 'width']) $(`#tunnel-${parameter}-output`).textContent = tunnel[parameter].toFixed(2);
    const t = transmission(tunnel.energy, tunnel.height, tunnel.width);
    $('#tunnel-transmission').textContent = percent(t); $('#tunnel-reflection').textContent = percent(1 - t);
    $('#tunnel-regime').textContent = Math.abs(tunnel.energy - tunnel.height) < 1e-7 ? 'E = V / THRESHOLD' : tunnel.energy < tunnel.height ? 'E < V / TUNNELING' : 'E > V / SCATTERING';
    const path = Array.from({ length: 241 }, (_, i) => `${i ? 'L' : 'M'}${30 + 550 * i / 240} ${115 - 100 * transmission(i / 240 * 3, tunnel.height, tunnel.width)}`).join(' ');
    $('#tunnel-curve').setAttribute('d', path);
    const x = 30 + 550 * tunnel.energy / 3, y = 115 - 100 * t;
    $('#tunnel-energy-line').setAttribute('d', `M${x} 15V115`); $('#tunnel-energy-dot').setAttribute('cx', x); $('#tunnel-energy-dot').setAttribute('cy', y);
    $('#tunnel-plot').setAttribute('aria-label', `Transmission versus energy; current energy ${tunnel.energy}, transmission ${percent(t)}`);
    setTunnelRunning(false); clearTunnel(); drawTunnel(); status('Barrier parameters changed · counts cleared');
  }
  function sendParticles(count, repaint = true) {
    const p = transmission(tunnel.energy, tunnel.height, tunnel.width);
    for (let i = 0; i < count; i++) { const passed = random() < p; passed ? tunnel.transmitted++ : tunnel.reflected++; if (i < 25) tunnel.particles.push({ passed, lane: random(), born: elapsed + i * .015 }); }
    if (tunnel.particles.length > 180) tunnel.particles = tunnel.particles.slice(-180);
    renderTunnelCounts(); if (repaint) drawTunnel();
  }
  for (const id of ['#tunnel-energy', '#tunnel-height', '#tunnel-width']) $(id).addEventListener('input', updateTunnel);
  $('#tunnel-fire').addEventListener('click', () => { sendParticles(100); status(`${(tunnel.transmitted + tunnel.reflected).toLocaleString()} particles sampled`); });
  $('#tunnel-toggle').addEventListener('click', () => { setTunnelRunning(!tunnel.running); status(tunnel.running ? 'Continuous beam active · 24 particles per second' : 'Particle beam paused'); });
  $('#tunnel-reset').addEventListener('click', () => { setTunnelRunning(false); clearTunnel(); drawTunnel(); status('Particle counts reset'); });

  $$('[data-challenge]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.challenge; selectSimulation(name);
    if (name === 'qubit') { Object.assign(qubit, { theta: 90, phi: 0, noise: 0, basis: 'X', history: [] }); clearQubitShots(); renderQubit(); measureQubit(); status('|+⟩ measured in X · positive outcome is certain'); }
    if (name === 'slit') { $('#which-path').checked = !$('#which-path').checked; updateSlit(); emitPhotons(1200); status(`1,200 photons sampled · which-path ${slit.whichPath ? 'recorded' : 'unrecorded'}`); }
    if (name === 'bell') { Object.assign(bell, { alice: 0, bob: 0, noise: 0 }); clearBell(); measureBell(); status('Matching analyzers · all ideal pairs match'); }
    if (name === 'tunnel') { $('#tunnel-energy').value = 1; $('#tunnel-height').value = 1.5; $('#tunnel-width').value = number('#tunnel-width') < 2 ? 2.5 : .5; updateTunnel(); sendParticles(100); status(`Barrier width ${tunnel.width} · transmission ${percent(transmission(tunnel.energy, tunnel.height, tunnel.width))}`); }
  }));
  $('#export-experiment').addEventListener('click', () => {
    const data = { project: 'QuantumApplicationsbyNJR', experiment: active, generatedAt: new Date().toISOString(), educationalSimulation: true };
    if (active === 'qubit') Object.assign(data, { model: 'rho=(1-p)|psi><psi|+pI/2', parameters: { theta: qubit.theta, phi: qubit.phi, noise: qubit.noise, basis: qubit.basis }, expectedPositive: qubitProbability(qubit.theta, qubit.phi, qubit.noise, qubit.basis), counts: { positive: qubit.zeroes, negative: qubit.ones }, gates: qubit.history.map(item => item.gate) });
    if (active === 'slit') Object.assign(data, { model: 'Fraunhofer double slit, 1um slit width, 100mm screen distance', parameters: { wavelengthNm: slit.wavelength, separationUm: slit.separation, whichPath: slit.whichPath }, total: slit.count, bins: slit.bins.map((count, i) => ({ xMm: -40 + 80 * i / 240, count, expectedProbability: slitProbabilities[i] })) });
    if (active === 'bell') Object.assign(data, { model: 'Phi+ linear polarization, white-noise mixture', parameters: { aliceDegrees: bell.alice, bobDegrees: bell.bob, noise: bell.noise }, outcomes: ['00', '01', '10', '11'], counts: bell.counts, probabilities: bellProbabilities(bell.alice, bell.bob, bell.noise), chsh: bell.chsh });
    if (active === 'tunnel') Object.assign(data, { model: 'Stationary rectangular-barrier scattering, m=hbar=1', parameters: { energy: tunnel.energy, height: tunnel.height, width: tunnel.width }, expectedTransmission: transmission(tunnel.energy, tunnel.height, tunnel.width), counts: { transmitted: tunnel.transmitted, reflected: tunnel.reflected } });
    const url = window.URL.createObjectURL(new window.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `quantum-${active}-experiment.json`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    status(`${names[active]} results exported`);
  });

  function surface(id, width, height) {
    const canvas = $(id), ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const actualWidth = Math.max(1, rect.width || width), actualHeight = actualWidth * height / width;
    if (canvas.width !== Math.round(actualWidth * dpr) || canvas.height !== Math.round(actualHeight * dpr)) { canvas.width = Math.round(actualWidth * dpr); canvas.height = Math.round(actualHeight * dpr); }
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#3a5a4520'; ctx.lineWidth = 1;
    for (let x = 20; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, height - 10); ctx.stroke(); }
    for (let y = 20; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(width - 10, y); ctx.stroke(); }
    return ctx;
  }
  function text(ctx, label, x, y, color = '#859d8d') { ctx.fillStyle = color; ctx.font = `${window.innerWidth <= 520 ? 18 : 11}px monospace`; ctx.fillText(label, x, y); }
  function drawSlit() {
    if (active !== 'slit') return;
    const ctx = surface('#slit-canvas', 800, 360); if (!ctx) return;
    const phase = reducedMotion ? 0 : elapsed;
    const middle = 180, barrierX = 224, screenX = 671, slitGap = 24 + slit.separation * 3;
    ctx.fillStyle = '#0c1716'; ctx.fillRect(663, 42, 103, 276);
    ctx.strokeStyle = '#526c63'; ctx.lineWidth = 5;
    for (const [a, b] of [[35, middle - slitGap - 9], [middle - slitGap + 9, middle + slitGap - 9], [middle + slitGap + 9, 325]]) { ctx.beginPath(); ctx.moveTo(barrierX, a); ctx.lineTo(barrierX, b); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(30, 35, barrierX - 35, 290); ctx.clip();
    for (let i = 0; i < 8; i++) { const x = 20 + ((i * 29 + phase * 36) % 232); ctx.strokeStyle = `rgba(128,228,231,${.13 + i * .012})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 300); ctx.stroke(); }
    ctx.restore();
    for (const sign of [-1, 1]) {
      ctx.save(); ctx.beginPath(); ctx.rect(barrierX + 4, 35, screenX - barrierX - 8, 290); ctx.clip();
      const sy = middle + sign * slitGap;
      for (let i = 0; i < 10; i++) { const radius = ((i * 48 + phase * 37) % 480) + 4; ctx.strokeStyle = slit.whichPath ? 'rgba(128,228,231,.08)' : 'rgba(197,242,119,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(barrierX, sy, radius, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = slit.whichPath ? '#80e4e7' : '#c5f277'; ctx.fillRect(barrierX - 3, sy - 8, 6, 16);
      if (slit.whichPath) { ctx.strokeStyle = '#80e4e7'; ctx.lineWidth = 1; ctx.strokeRect(barrierX - 12, sy - 13, 24, 26); }
    }
    for (let bin = 0; bin < 241; bin++) { const intensity = slitIntensity(-40 + 80 * bin / 240, slit.wavelength, slit.separation, slit.whichPath); ctx.fillStyle = `rgba(197,242,119,${.03 + intensity * .22})`; ctx.fillRect(screenX, 48 + bin / 240 * 262, 83, 2); }
    for (const hit of slit.hits) { const y = 49 + hit.bin / 240 * 262; ctx.fillStyle = '#d6f9a3bc'; ctx.beginPath(); ctx.arc(screenX + 7 + hit.x * 69, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#80e4e7'; ctx.beginPath(); ctx.arc(38, middle, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'SOURCE', 17, 341); text(ctx, 'TWO SLITS', 191, 341); text(ctx, 'DETECTOR', 676, 341);
    text(ctx, slit.count ? `${slit.count.toLocaleString()} DETECTIONS` : 'WAITING FOR PHOTONS', 492, 23, '#a5c68b');
  }
  function drawTunnel() {
    if (active !== 'tunnel') return;
    const ctx = surface('#tunnel-canvas', 800, 330); if (!ctx) return;
    const floor = 264, x1 = 310, x2 = x1 + tunnel.width * 65, top = floor - tunnel.height * 61;
    const energyY = floor - tunnel.energy * 61;
    const gradient = ctx.createLinearGradient(x1, 0, x2, 0); gradient.addColorStop(0, '#80e4e710'); gradient.addColorStop(.5, '#80e4e72b'); gradient.addColorStop(1, '#80e4e710');
    ctx.fillStyle = gradient; ctx.fillRect(x1, top, x2 - x1, floor - top);
    ctx.strokeStyle = '#80e4e78c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30, floor); ctx.lineTo(x1, floor); ctx.lineTo(x1, top); ctx.lineTo(x2, top); ctx.lineTo(x2, floor); ctx.lineTo(765, floor); ctx.stroke();
    ctx.setLineDash([5, 7]); ctx.strokeStyle = '#c5f27770'; ctx.beginPath(); ctx.moveTo(30, energyY); ctx.lineTo(765, energyY); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `V = ${tunnel.height.toFixed(2)}`, x1 + 8, top - 12, '#80e4e7'); text(ctx, `E = ${tunnel.energy.toFixed(2)}`, 31, energyY - 12, '#c5f277'); text(ctx, `a = ${tunnel.width.toFixed(2)}`, (x1 + x2) / 2 - 25, 285);
    const t = transmission(tunnel.energy, tunnel.height, tunnel.width);
    ctx.strokeStyle = '#c5f277'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 30; x <= 765; x += 2) {
      const local = x < x1 ? 1 : x <= x2 ? Math.exp(-Math.max(0, x - x1) / 55 * Math.sqrt(Math.max(0, tunnel.height - tunnel.energy))) : Math.sqrt(t);
      const y = energyY + Math.sin(x / 13 - (reducedMotion ? 0 : elapsed * 3)) * 17 * local;
      if (x === 30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Particle trajectories illustrate outcome frequencies; they are not quantum paths.
    for (const particle of tunnel.particles) {
      let progress = (elapsed - particle.born) / 2.6;
      if (progress < 0 || progress > 1) continue;
      if (reducedMotion) progress = .7;
      let x;
      if (particle.passed) x = 30 + progress * 735;
      else if (progress < .45) x = 30 + progress / .45 * (x1 - 30);
      else x = x1 - (progress - .45) / .55 * (x1 - 30);
      const y = energyY + (particle.lane - .5) * 56;
      ctx.fillStyle = particle.passed ? '#c5f277' : '#80e4e7'; ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, 'INCIDENT', 35, 313); text(ctx, `T = ${percent(t)}`, 640, 313, '#c5f277');
  }
  function draw() { if (active === 'slit') drawSlit(); if (active === 'tunnel') drawTunnel(); }
  function animate(time) {
    frame = 0;
    if (document.hidden || !labVisible || !['slit', 'tunnel'].includes(active)) { lastTime = 0; return; }
    if (lastTime && time - lastTime < 32) { frame = window.requestAnimationFrame(animate); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .08) : 0; lastTime = time; elapsed += dt;
    if (active === 'slit' && slit.running) { slit.remainder += dt * 40; const count = Math.floor(slit.remainder); if (count) { slit.remainder -= count; emitPhotons(count, false); } }
    if (active === 'tunnel' && tunnel.running) { tunnel.remainder += dt * 24; const count = Math.floor(tunnel.remainder); if (count) { tunnel.remainder -= count; sendParticles(count, false); } }
    draw(); frame = window.requestAnimationFrame(animate);
  }
  function resume() { if (!frame && !document.hidden && labVisible && ['slit', 'tunnel'].includes(active)) frame = window.requestAnimationFrame(animate); }
  new window.IntersectionObserver(entries => { labVisible = entries[0].isIntersecting; document.body.classList.toggle('lab-in-view', labVisible); $('.lab-dock').tabIndex = labVisible ? -1 : 0; if (!labVisible && frame) { window.cancelAnimationFrame(frame); frame = 0; lastTime = 0; } resume(); }).observe($('#simulation-workbench'));
  new window.ResizeObserver(draw).observe($('#simulation-workbench'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && frame) { window.cancelAnimationFrame(frame); frame = 0; lastTime = 0; } resume(); });
  renderQubit(); updateSlit(); renderBell(); updateTunnel(); selectSimulation('qubit'); resume();
}
