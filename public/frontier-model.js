export const NEWS_CATEGORIES = [
  { id: 'all', label: 'All developments' },
  { id: 'computing', label: 'Computing' },
  { id: 'physics', label: 'Physics' },
  { id: 'ai', label: 'Quantum AI' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'research', label: 'Research' },
];
export const TECHNOLOGIES = [
  { id: 'all', label: 'All technologies' },
  { id: 'superconducting', label: 'Superconducting' },
  { id: 'ions', label: 'Trapped ions' },
  { id: 'neutral-atoms', label: 'Neutral atoms' },
  { id: 'photonics', label: 'Photonics' },
  { id: 'hybrid', label: 'Hybrid & software' },
  { id: 'topological', label: 'Topological research' },
  { id: 'annealing', label: 'Annealing' },
];
export const APPLICATION_NAMES = ['Semiconductors & electronics', 'Medical imaging', 'Chemistry & catalysis', 'Quantum sensing', 'Quantum communications', 'Materials & batteries', 'Photonics & lasers', 'Atomic clocks & navigation', 'Drug discovery', 'Optimization & logistics', 'Finance', 'AI & machine learning', 'Climate & energy', 'Space & aerospace', 'Defense & cybersecurity'];
export const COMPANY_NAMES = { ibm: 'IBM', google: 'Google Quantum AI', microsoft: 'Microsoft', nvidia: 'NVIDIA', ionq: 'IonQ', quantinuum: 'Quantinuum', rigetti: 'Rigetti', dwave: 'D-Wave', psiquantum: 'PsiQuantum', quera: 'QuEra' };
export const LAB_NAMES = { qubit: 'Qubit studio', slit: 'Double slit', bell: 'Entanglement', tunnel: 'Tunneling' };

export function connectionsFor(text, sourceId = '') {
  const categories = new Set(['research']), applications = new Set(), companies = new Set();
  const semanticText = text.replace(/\bGoogle Quantum AI\b/gi, 'Google quantum research');
  const rules = [
    [/\b(quantum comput\w*|qubits?|circuits?|gates?|algorithms?|error.correct\w*|fault.toleran\w*|qiskit|annealing|QAOA|VQE)\b/i, 'computing'],
    [/\b(physics|entangl|superpos|quantum material|spin|photon|many.body|condensed|superconductivity)\w*/i, 'physics'],
    [/\b(machine.learn|neural.network|artificial intelligence|large language|generative|quantum ai|decoder.*learn|ai.assist|llms?|ising calibration)\w*/i, 'ai'],
    [/\b(processor|chip|qubits?|hardware|cryogen|ions?|neutral.atom|junction|fabricat|photonic|interconnect)\w*/i, 'hardware'],
  ];
  for (const [pattern, category] of rules) if (pattern.test(semanticText)) categories.add(category);
  const companyRules = { ibm: /\b(IBM|Qiskit|Nighthawk|Heron)\b/i, google: /\b(Google|Willow|Sycamore)\b/i, microsoft: /\b(Microsoft|Majorana [12]|Azure Quantum)\b/i, nvidia: /\b(NVIDIA|CUDA-Q|cuQuantum|NVQLink)\b/i, ionq: /\bIonQ\b/i, quantinuum: /\b(Quantinuum|Guppy|TKET)\b/i, rigetti: /\b(Rigetti|Cepheus|Novera)\b/i, dwave: /\bD[–-]Wave\b/i, psiquantum: /\bPsiQuantum\b/i, quera: /\b(QuEra|Aquila)\b/i };
  for (const [id, pattern] of Object.entries(companyRules)) if (pattern.test(text)) companies.add(id);
  if (sourceId === 'ibm' || sourceId === 'google') companies.add(sourceId);
  const appRules = [
    [/chemistr|cataly|molecul|electronic.structure/i, [2]], [/batter|materials?|solid.state|superconductiv/i, [5]],
    [/sens(ing|or)|magnetometr|gravimetr|metrolog/i, [3]], [/network|communicat|teleport|key.distribut|photonic.interconnect/i, [4]],
    [/photon|laser|optical/i, [6]], [/clock|navigat|timing/i, [7]], [/drug|pharmaceut/i, [8]],
    [/optimiz|routing|schedul|anneal/i, [9]], [/financ|portfolio|monte.carlo/i, [10]],
    [/machine.learn|artificial.intelligence|quantum.ai|neural|large.language|generative|\bLLM/i, [11]],
    [/climate|energy/i, [12]], [/satellite|aerospace|space.based/i, [13]], [/cryptograph|cyber|quantum.safe/i, [14]],
    [/semiconductor|tunnel|electronic.device/i, [0]],
  ];
  for (const [pattern, ids] of appRules) if (pattern.test(semanticText)) ids.forEach(id => applications.add(id));
  const lab = /tunnel|barrier/i.test(text) ? 'tunnel' : /entangl|teleport|bell|quantum.network|key.distribut|photonic.interconnect/i.test(text) ? 'bell' : /interfer|diffract|photon|sensor|sensing|metrolog/i.test(text) ? 'slit' : 'qubit';
  return { categories: [...categories], companies: [...companies], applications: [...applications], lab };
}

export function safeExternalUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
