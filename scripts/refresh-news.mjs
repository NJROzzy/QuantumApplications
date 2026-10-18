import { readFile, writeFile } from 'node:fs/promises';
import { collectNews } from '../lib/news-service.js';
let snapshot;
try { snapshot = JSON.parse(await readFile('public/content/news-snapshot.json', 'utf8')); } catch { snapshot = { articles: [], checkedAt: null }; }
const data = await collectNews({ snapshot });
if (!data.articles.length) throw new Error('No news retrieved; existing snapshot has not been overwritten.');
await writeFile('public/content/news-snapshot.json', JSON.stringify(data, null, 2) + '\n');
for (const source of data.sources) console.log(`${source.name}: ${source.state} / ${source.itemCount} items${source.reason ? ` (${source.reason})` : ''}`);
console.log(`Saved ${data.articles.length} research updates at ${data.checkedAt}.`);
