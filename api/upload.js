// POST /api/upload  (corpo: il file come application/octet-stream; intestazione X-File-Name)
// Carica un'immagine o un PDF. Il file entra nel sito solo quando si pubblica.

import { randomBytes } from 'node:crypto';
import { handler, send, readRaw, requireUser, httpError } from './_lib/http.js';
import { getStore } from './_lib/store.js';

export const MAX_UPLOAD = 4 * 1024 * 1024; // limite delle funzioni Vercel: 4,5 MB per richiesta

const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

// Controlla i primi byte: il contenuto deve corrispondere al tipo dichiarato
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 4).toString() === 'GIF8') return 'image/gif';
  if (buf.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

function baseName(name) {
  const base = decodeURIComponent(String(name || 'file')).replace(/\.[^.]*$/, '');
  return base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'file';
}

export default handler({
  async POST(req, res) {
    await requireUser(req);
    const buf = await readRaw(req, MAX_UPLOAD);
    if (!buf.length) throw httpError(400, 'File vuoto');
    const type = sniff(buf);
    if (!type) throw httpError(400, 'Formato non supportato: usa JPG, PNG, WEBP, GIF o PDF');

    const now = new Date();
    const dir = `assets/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const path = `${dir}/${baseName(req.headers['x-file-name'])}-${randomBytes(3).toString('hex')}.${TYPES[type]}`;
    const id = await getStore().createUpload(buf);
    send(res, 200, { path, id, tipo: type });
  },
});

