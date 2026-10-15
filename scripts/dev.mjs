// Server locale per provare sito e pannello senza Vercel: npm run dev
// Usa i file del progetto al posto di GitHub e rigenera il sito dopo ogni pubblicazione.
// Utente di prova: admin / admin (oppure ADMIN_USER e ADMIN_PASSWORD).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { LocalStore, setStore } from '../api/_lib/store.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};

setStore(new LocalStore({ root: ROOT, onCommit: () => build({ quiet: true }) }));
await build();

const handlers = {};
async function api(name) {
  if (!/^[a-z]+$/.test(name)) return null;
  if (!handlers[name]) {
    try {
      handlers[name] = (await import(`../api/${name}.js`)).default;
    } catch {
      return null;
    }
  }
  return handlers[name];
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    const fn = await api(url.pathname.slice(5).replace(/\/$/, ''));
    if (fn) return fn(req, res);
    res.statusCode = 404;
    return res.end('Not found');
  }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path);
  try {
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(308, { Location: url.pathname + '/' });
        return res.end();
      }
      file = join(file, 'index.html');
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Pagina non trovata');
  }
}).listen(PORT, () => {
  console.log(`Sito:    http://localhost:${PORT}/`);
  console.log(`Pannello: http://localhost:${PORT}/admin/`);
});
