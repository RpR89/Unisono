// GET /api/file?path=assets/...  -> file dall'archivio, per l'anteprima delle immagini
// appena pubblicate che il sito online non ha ancora.

import { handler, requireUser, httpError } from './_lib/http.js';
import { getStore } from './_lib/store.js';
import { isAssetPath } from '../lib/validate.mjs';

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf' };

export default handler({
  async GET(req, res) {
    await requireUser(req);
    const url = new URL(req.url, 'http://localhost');
    const path = url.searchParams.get('path') || '';
    const ext = path.split('.').pop().toLowerCase();
    if (!isAssetPath(path) || !MIME[ext]) throw httpError(400, 'Percorso non valido');
    const buf = await getStore().readFile(path);
    if (!buf) throw httpError(404, 'File non trovato');
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext]);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buf);
  },
});
