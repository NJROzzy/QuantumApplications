import { APPLICATION_NAMES, COMPANY_NAMES } from './frontier-model.js';

export const NODE_KINDS = {
  concept: { label: 'Principles', color: '#c5f277' }, application: { label: 'Applications', color: '#80e4e7' },
  technique: { label: 'Techniques', color: '#d8b7ff' }, software: { label: 'Software', color: '#93b9ff' },
  company: { label: 'Industry', color: '#e3cb8b' }, person: { label: 'People & teams', color: '#eaa8bd' },
  project: { label: 'Current projects', color: '#91d8b1' }, pioneer: { label: 'Historic contributors', color: '#f2ad7f' },
};
export const PRINCIPLES = [
  ['superposition', 'Superposition', 'A state combines probability amplitudes. Relative phase allows those amplitudes to interfere.', 0, 'qubit'],
  ['entanglement', 'Entanglement', 'A joint state can have correlations that independent descriptions cannot capture. It does not enable faster-than-light messages.', 1, 'bell'],
  ['wave-particle', 'Waves & interference', 'Quantum amplitudes interfere while experiments record localized outcomes.', 2, 'slit'],
  ['quantization', 'Quantization', 'Bound systems can have discrete allowed energies; transitions connect those energies to measurable signals.', 3, 'qubit'],
  ['uncertainty', 'Uncertainty', 'Noncommuting observables impose limits on simultaneous precision.', 4, 'qubit'],
  ['decoherence', 'Coherence & noise', 'Uncontrolled interactions reduce accessible phase coherence, motivating control, mitigation, and error correction.', 5, 'qubit'],
  ['tunneling', 'Tunneling', 'Quantum amplitudes can transmit through a classically forbidden energy barrier.', 6, 'tunnel'],
  ['spin', 'Spin & quantum statistics', 'Intrinsic angular momentum and particle statistics shape resonance, atomic structure, and material behavior.', 7, 'qubit'],
];
const APP_LINKS = [
  [['quantization','spin','tunneling'], 'Quantum states in solids explain band structure; tunneling is relevant in small devices and deliberately exploited in some technologies.'],
  [['spin','quantization'], 'Nuclear spin resonance and energy transitions underpin NMR and MRI.'],
  [['superposition','entanglement','spin'], 'Electronic quantum states and their interactions are the subject of chemistry; computational advantage for hard instances remains a research goal.'],
  [['decoherence','uncertainty','spin','wave-particle'], 'Quantum sensors use controlled states, resonance, or interference; noise and measurement precision constrain performance.'],
  [['entanglement','superposition','wave-particle'], 'States, measurement bases, and entanglement support quantum communication protocols under explicit implementation assumptions.'],
  [['spin','superposition','entanglement'], 'Electronic states and correlations shape materials; predicting difficult systems is a quantum-simulation research direction.'],
  [['quantization','wave-particle'], 'Energy transitions, stimulated emission, and optical coherence help explain lasers and other photonic technologies.'],
  [['quantization','wave-particle'], 'Atomic transitions define frequency references; interference supports some developing inertial sensors.'],
  [['superposition','entanglement'], 'Molecular simulation is studied as one possible part of pharmaceutical workflows, with no general clinical advantage established.'],
  [['superposition','tunneling'], 'Quantum circuits and annealing are explored for selected optimization problems; strong classical comparisons are essential.'],
  [['superposition','wave-particle'], 'Interference-based estimation algorithms motivate financial research, subject to data-access and resource assumptions.'],
  [['superposition','entanglement'], 'Quantum feature maps and trainable circuits are research approaches; broad machine-learning advantage is not established.'],
  [['spin','superposition'], 'Materials research and sensing can inform energy technologies; this does not imply a general quantum speedup for climate models.'],
  [['quantization','wave-particle','entanglement'], 'Atomic timing, interferometry, and space communication motivate aerospace research with different maturity levels.'],
  [['superposition','entanglement'], 'Quantum algorithms motivate classical post-quantum cryptography; quantum communication is a separate approach with different assumptions.'],
];
const METHOD_PRINCIPLES = {
  circuits: ['superposition','decoherence'], vqe: ['superposition','entanglement'], qaoa: ['superposition','wave-particle'],
  qpe: ['wave-particle','superposition'], grover: ['wave-particle','superposition'], hamiltonian: ['superposition','spin'],
  qec: ['decoherence','entanglement'], mitigation: ['decoherence'], annealing: ['tunneling','superposition'],
  qml: ['superposition','entanglement'], interferometry: ['wave-particle','uncertainty'], qkd: ['superposition','wave-particle'],
};
export const pioneerId = name => 'pioneer:' + name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function buildUniverse({ toolkit, industry, innovators, evolution }) {
  const nodes = [], edges = [], byId = new Map(), adjacency = new Map(), edgeKeys = new Set();
  const add = node => { if (byId.has(node.id)) return; nodes.push(node); byId.set(node.id, node); adjacency.set(node.id, []); };
  const link = (source, target, relation, detail, sourceUrl = null) => {
    if (!byId.has(source) || !byId.has(target)) throw new Error(`Unknown universe connection: ${source} → ${target}`);
    const key = [source, target].sort().join('|') + '|' + relation;
    if (source === target || edgeKeys.has(key)) return;
    edgeKeys.add(key); const edge = { source, target, relation, detail, sourceUrl }; edges.push(edge);
    adjacency.get(source).push({ id: target, edge }); adjacency.get(target).push({ id: source, edge });
  };
  for (const [id, label, description, concept, lab] of PRINCIPLES) add({ id: `concept:${id}`, kind: 'concept', label, description, concept, lab, chapter: 1, maturity: 'Established principle' });
  APPLICATION_NAMES.forEach((label, index) => add({ id: `application:${index}`, kind: 'application', label, description: APP_LINKS[index][1], application: index, maturity: [0,1,6,7].includes(index) ? 'Established technology' : [3,4,14].includes(index) ? 'Emerging / mixed maturity' : 'Research & exploration', chapter: 8 }));
  for (const item of toolkit.techniques) add({ id: `technique:${item.id}`, kind: 'technique', label: item.name, description: item.summary, ref: item.id, lab: item.lab, chapter: item.chapter, source: item.url, maturity: item.status });
  for (const item of toolkit.tools) add({ id: `software:${item.id}`, kind: 'software', label: item.name, description: item.summary, ref: item.id, lab: item.lab, chapter: item.chapter, source: item.url, maturity: item.kind });
  for (const item of industry.companies) add({ id: `company:${item.id}`, kind: 'company', label: item.name, description: item.description, ref: item.id, lab: item.lab, source: item.website, maturity: 'Company profile' });
  for (const item of innovators.people) add({ id: `person:${item.id}`, kind: 'person', label: item.name, description: item.focus, ref: item.id, source: item.url, maturity: `${item.kind} · ${item.organization}` });
  for (const item of innovators.projects) add({ id: `project:${item.id}`, kind: 'project', label: item.name, description: item.summary, ref: item.id, source: item.source.url, lab: item.lab, chapter: item.chapter, maturity: item.source.kind });
  for (const era of evolution.eras) for (const event of era.events) for (const name of event.people) {
    const id = pioneerId(name);
    if (!byId.has(id)) add({ id, kind: 'pioneer', label: name, description: `${event.year}: ${event.text}`, event: event.id, era: era.id, source: event.source.url, lab: event.lab, chapter: 3, maturity: 'Historic contributor · selected milestone' });
  }
  APP_LINKS.forEach(([principles, detail], index) => principles.forEach(id => link(`concept:${id}`, `application:${index}`, 'Helps explain', detail)));
  for (const item of toolkit.techniques) {
    for (const principle of METHOD_PRINCIPLES[item.id] || []) link(`concept:${principle}`, `technique:${item.id}`, 'Principle → method', `${PRINCIPLES.find(p => p[0] === principle)[1]} helps explain ${item.name.toLowerCase()}. Explore the method’s assumptions and practical limits.`, item.url);
    for (const index of item.applications) link(`technique:${item.id}`, `application:${index}`, 'Related workflow', `${item.name} connects to ${APPLICATION_NAMES[index]} as a method or learning pathway; this does not establish practical advantage.`, item.url);
  }
  for (const item of toolkit.tools) {
    for (const id of item.techniques) link(`software:${item.id}`, `technique:${id}`, 'Related software', `${item.name} supports related workflows or educational implementations. Extra packages or custom code may be required; check the official documentation.`, item.url);
    for (const id of item.companies) link(`company:${id}`, `software:${item.id}`, 'Develops', `${COMPANY_NAMES[id]} develops ${item.name} within its software ecosystem.`, item.url);
  }
  for (const item of industry.companies) for (const index of item.applications) link(`company:${item.id}`, `application:${index}`, 'Research / application interest', `The curated ${item.name} profile connects its research to ${APPLICATION_NAMES[index]}. This is not a claim of a delivered application or comparative advantage.`, item.website);
  for (const item of innovators.people) {
    for (const id of item.projects) link(`person:${item.id}`, `project:${id}`, 'Connected research role', `${item.name} is a representative contributor, research leader, or participating team associated with this work. Full authorship and roles belong to the original sources.`, item.url);
    for (const id of item.companies) link(`company:${id}`, `person:${item.id}`, 'Affiliation', `${item.name} is connected to ${COMPANY_NAMES[id]} in the sourced profile.`, item.url);
  }
  for (const item of innovators.projects) {
    for (const id of item.companies) link(`company:${id}`, `project:${item.id}`, 'Organization → project', `${COMPANY_NAMES[id]} is the organization linked to this project in its source.`, item.source.url);
    for (const id of item.techniques) link(`project:${item.id}`, `technique:${id}`, 'Related method', 'A conceptual connection to this project’s subject. It is not a claim that the project implements every linked technique.', item.source.url);
    for (const index of item.applications) link(`project:${item.id}`, `application:${index}`, 'Application context', `${item.name} has a learning connection to ${APPLICATION_NAMES[index]}. Its demonstrated scope is described by the original source.`, item.source.url);
  }
  for (const era of evolution.eras) for (const event of era.events) {
    for (const name of event.people) for (const topic of event.topics) link(pioneerId(name), `concept:${topic}`, 'Historical contribution', `${event.year} · ${event.title}. ${event.text}`, event.source.url);
    for (const id of event.connections || []) for (const topic of event.topics) link(id, `concept:${topic}`, 'Historical context', `${event.year} · ${event.title}. ${event.text}`, event.source.url);
  }
  return { nodes, edges, byId, adjacency };
}

export function neighbors(graph, id) {
  const unique = new Map();
  for (const connection of graph.adjacency.get(id) || []) if (!unique.has(connection.id)) unique.set(connection.id, connection);
  return [...unique.values()];
}
export function tracePath(graph, start, end) {
  if (!graph.byId.has(start) || !graph.byId.has(end)) return null;
  const queue = [start], visited = new Map([[start, null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === end) {
      const result = []; let id = end;
      while (id !== null) { result.unshift(id); id = visited.get(id); }
      return result;
    }
    for (const { id } of neighbors(graph, current)) if (!visited.has(id)) { visited.set(id, current); queue.push(id); }
  }
  return null;
}
export function orbitLayout(count) {
  return Array.from({ length: Math.min(12, Math.max(0, count)) }, (_, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / Math.min(count, 12);
    return { x: 450 + Math.cos(angle) * 325, y: 300 + Math.sin(angle) * 205 };
  });
}
