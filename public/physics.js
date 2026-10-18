// Small, deterministic educational models. Units and assumptions are stated in the lab.
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const radians = degrees => degrees * Math.PI / 180;

export function blochVector(theta, phi = 0, noise = 0) {
  const t = radians(theta), p = radians(phi), length = 1 - clamp(noise);
  return { x: length * Math.sin(t) * Math.cos(p), y: length * Math.sin(t) * Math.sin(p), z: length * Math.cos(t) };
}

export function qubitProbability(theta, phi = 0, noise = 0, basis = 'Z') {
  const vector = blochVector(theta, phi, noise);
  return clamp((1 + vector[basis.toLowerCase()]) / 2);
}

export function applyGate(theta, phi, gate) {
  const { x, y, z } = blochVector(theta, phi);
  const c = Math.SQRT1_2;
  const next = { H: [z, -y, x], X: [x, -y, -z], Y: [-x, y, -z], Z: [-x, -y, z], S: [-y, x, z], T: [c * (x - y), c * (x + y), z] }[gate];
  if (!next) throw new Error(`Unknown gate: ${gate}`);
  const [nx, ny, nz] = next;
  const nextTheta = Math.acos(clamp(nz, -1, 1)) * 180 / Math.PI;
  const nextPhi = Math.hypot(nx, ny) < 1e-10 ? 0 : (Math.atan2(ny, nx) * 180 / Math.PI + 360) % 360;
  return { theta: nextTheta, phi: nextPhi };
}

// Far-field double slit: fixed slit width 1 µm, screen distance 100 mm.
// x is in mm; wavelength in nm; separation in µm. Detection window: ±40 mm.
export function slitIntensity(x, wavelength = 550, separation = 5, whichPath = false) {
  const ratio = x / ((wavelength / 1000) * 100);
  const beta = Math.PI * ratio;
  const envelope = Math.abs(beta) < 1e-10 ? 1 : (Math.sin(beta) / beta) ** 2;
  return envelope * (whichPath ? 1 : Math.cos(Math.PI * separation * ratio) ** 2);
}

export function slitDistribution(wavelength, separation, whichPath, bins = 241) {
  const weights = Array.from({ length: bins }, (_, i) => slitIntensity(-40 + 80 * i / (bins - 1), wavelength, separation, whichPath));
  const sum = weights.reduce((total, value) => total + value, 0);
  return weights.map(value => value / sum);
}

// |Φ+⟩ measured by linear-polarization analyzers, with white-noise fraction p.
export function bellProbabilities(alice, bob, noise = 0) {
  const correlation = (1 - clamp(noise)) * Math.cos(2 * radians(alice - bob));
  return [(1 + correlation) / 4, (1 - correlation) / 4, (1 - correlation) / 4, (1 + correlation) / 4];
}

export function expectedCHSH(noise = 0) { return 2 * Math.SQRT2 * (1 - clamp(noise)); }

// Exact stationary transmission for a 1D rectangular barrier, m = ħ = 1.
export function transmission(energy, height, width) {
  if (energy <= 0) return 0;
  if (height <= 0 || width <= 0) return 1;
  const delta = height - energy;
  if (Math.abs(delta) < 1e-8) return 1 / (1 + height * width * width / 2);
  const phase = Math.sqrt(2 * Math.abs(delta)) * width;
  const oscillation = delta > 0 ? Math.sinh(phase) : Math.sin(phase);
  return clamp(1 / (1 + height * height * oscillation * oscillation / (4 * energy * Math.abs(delta))));
}

export function sampleDistribution(probabilities, random = Math.random) {
  const value = random();
  let total = 0;
  for (let i = 0; i < probabilities.length; i++) { total += probabilities[i]; if (value < total) return i; }
  return probabilities.length - 1;
}
