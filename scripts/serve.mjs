import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import newsHandler from '../api/news.js';
import { pageForPath } from '../public/page-model.js';
import { renderPageHtml } from '../lib/page-html.js';
const root = resolve(process.env.SERVE_DIST ? 'dist' : 'public');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/news') { await newsHandler(req, res); return; }
    const page = pageForPath(url.pathname);
    if (page && !process.env.SERVE_DIST) {
      const html = renderPageHtml(await readFile(resolve(root,'index.html'),'utf8'),page);
      res.writeHead(200,{'Content-Type':types['.html']}); res.end(req.method === 'HEAD' ? '' : html); return;
    }
    const path = resolve(root, page && process.env.SERVE_DIST ? page.path === '/' ? 'index.html' : page.path.slice(1)+'.html' : '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + '/')) throw new Error('Invalid path');
    const file = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Local: http://localhost:${port}`));
