import assert from 'node:assert/strict';
import { blochVector, qubitProbability, applyGate, slitIntensity, slitDistribution, bellProbabilities, expectedCHSH, transmission, sampleDistribution } from '../public/physics.js';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
close(qubitProbability(0), 1);
close(qubitProbability(180), 0);
close(qubitProbability(60), .75);
close(qubitProbability(90, 0, 0, 'X'), 1);
close(qubitProbability(90, 180, 0, 'X'), 0);
close(qubitProbability(90, 90, 0, 'Y'), 1);
for (const basis of ['X', 'Y', 'Z']) close(qubitProbability(37, 123, 1, basis), .5);
close(Math.hypot(...Object.values(blochVector(83, 27, .3))), .7);
for (const gate of ['H', 'X', 'Y', 'Z']) {
  const first = applyGate(63, 117, gate), second = applyGate(first.theta, first.phi, gate);
  const before = blochVector(63, 117), after = blochVector(second.theta, second.phi);
  for (const axis of ['x', 'y', 'z']) close(after[axis], before[axis]);
}
const h = applyGate(0, 0, 'H'); close(qubitProbability(h.theta, h.phi, 0, 'X'), 1);
const phase = applyGate(90, 0, 'S'); close(qubitProbability(phase.theta, phase.phi, 0, 'Y'), 1);
close(slitIntensity(0), 1);
close(slitIntensity(5.5, 550, 5, false), 0);
assert.ok(slitIntensity(5.5, 550, 5, true) > .9);
for (const whichPath of [true, false]) {
  const distribution = slitDistribution(550, 5, whichPath);
  close(distribution.reduce((a, b) => a + b, 0), 1);
  for (let i = 0; i < distribution.length; i++) close(distribution[i], distribution[distribution.length - 1 - i]);
}
for (const angles of [[0, 0], [0, 45], [22.5, 90]]) {
  const p = bellProbabilities(...angles);
  close(p.reduce((a, b) => a + b, 0), 1);
  close(p[0] + p[1], .5); close(p[0] + p[2], .5);
}
assert.deepEqual(bellProbabilities(0, 0), [.5, 0, 0, .5]);
bellProbabilities(10, 70, 1).forEach(p => close(p, .25));
close(expectedCHSH(), Math.sqrt(8)); close(expectedCHSH(1), 0);
assert.ok(expectedCHSH(.1) > 2); assert.ok(expectedCHSH(.4) < 2);
close(transmission(1, 0, 2), 1); close(transmission(1, 2, 0), 1);
close(transmission(1, 1, 1), 2 / 3);
close(transmission(1 - 1e-9, 1, 1), transmission(1 + 1e-9, 1, 1));
assert.ok(transmission(1, 2, 2) < transmission(1, 2, 1));
for (let energy = .1; energy <= 3; energy += .1) { const value = transmission(energy, 1.5, 1.2); assert.ok(Number.isFinite(value) && value >= 0 && value <= 1); }
assert.equal(sampleDistribution([.2, .3, .5], () => .1), 0);
assert.equal(sampleDistribution([.2, .3, .5], () => .4), 1);
assert.equal(sampleDistribution([.2, .3, .5], () => .9), 2);
console.log('✓ Physics checks: Born rule, gate identities, diffraction, Bell marginals, CHSH, barrier limits, and sampling.');
