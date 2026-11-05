import { safeExternalUrl } from './frontier-model.js';

export const AI_PILLARS = [
  { id: 'tech', title: 'Quantum Technology', color: '#c5f277' },
  { id: 'programming', title: 'Quantum Programming', color: '#80e4e7' },
  { id: 'ml', title: 'Quantum Machine Learning', color: '#d8b7ff' },
  { id: 'advanced', title: 'Advanced Quantum AI', color: '#e3cb8b' },
];

// Classify the article's subject, not the publisher's name or existing broad tags.
export function aiPillarsFor(article) {
  const text = `${article.title || ''} ${article.summary || ''}`.replace(/\bGoogle Quantum AI\b/gi, 'Google research');
  const result = new Set();
  if (!/\b(quantum|qubits?|qiskit|cirq|qsharp|pennylane|cuda.q|superconducting|trapped.ions?|neutral.atoms?|surface.codes?|alphaqubit)\b|\bQ#/i.test(text)) return [];
  if (/\b(qubits?|processors?|hardware|superconducting|trapped.ions?|neutral.atoms?|photonic|cryogen\w*|calibrat\w*|decoherence|quantum.control|quantum.error.correct\w*|quantum.sensor\w*)\b/i.test(text)) result.add('tech');
  if (/\b(qiskit|cirq|qsharp|qdk|cuda.q|pennylane|tket|bloqade)\b|\bQ#|\bquantum[ -](circuits?|program\w*|software|compil\w*|algorithms?|simulat\w*)\b|\bcircuit[ -](compil\w*|transpil\w*|synth\w*)\b|\bhybrid[ -]quantum\b/i.test(text)) result.add('programming');
  const learning = /\b(quantum[ -](machine[ -]learning|learning|neural\w*|kernels?|classifi\w*|generative|feature\w*)|variational[ -](classifi\w*|learning)|barren[ -]plateaus?|quantum.natural.gradient|data.encod\w*|generative[ -]models?|transformers?)\b/i.test(text);
  const machineLearning = /\b(machine[ -]learning|neural[ -]networks?)\b/i.test(text);
  const hardwareAI = /\b(decod\w*|calibrat\w*|quantum.control|error.correct\w*)\b/i.test(text);
  if (learning || (machineLearning && !hardwareAI)) result.add('ml');
  if (/\b(fault[ -]toleran\w*|logical[ -]qubits?|resource[ -]estimat\w*|magic[ -]states?|surface[ -]codes?|quantum.error.correct\w*|alphaqubit|ising.calibrat\w*)\b/i.test(text) || (hardwareAI && /\b(neural\w*|machine.learning|AI[ -]assist\w*|artificial.intelligence|ising)\b/i.test(text)) || /\b(large[ -]language[ -]models?|llms?)\b.*\bquantum\b|\bquantum\b.*\b(large[ -]language[ -]models?|llms?)\b/i.test(text)) result.add('advanced');
  return [...result];
}

export function selectAiNews(feed, { pillar = 'all', source = 'all', query = '' } = {}) {
  const normalized = query.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  const seen = new Set(), sources = new Set(['arxiv','ibm','google','mit','nature']);
  return (feed?.articles || []).flatMap(article => {
    if (!article || typeof article.title !== 'string' || !sources.has(article.sourceId) || !safeExternalUrl(article.url) || seen.has(article.url)) return [];
    seen.add(article.url); const pillars = aiPillarsFor(article);
    const text = `${article.title} ${article.summary || ''} ${article.sourceName || ''}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
    return pillars.length && (pillar === 'all' || pillars.includes(pillar)) && (source === 'all' || source === article.sourceId) && text.includes(normalized) ? [{ ...article, aiPillars: pillars }] : [];
  }).sort((a, b) => (Number.isFinite(Date.parse(b.publishedAt)) ? Date.parse(b.publishedAt) : 0) - (Number.isFinite(Date.parse(a.publishedAt)) ? Date.parse(a.publishedAt) : 0));
}
