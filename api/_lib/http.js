// Utility HTTP comuni alle funzioni del pannello (compatibili con Vercel e con il server locale).

import { readSession } from './auth.js';
import { userExists } from './users.js';

export const MAX_JSON = 1024 * 1024; // 1 MB

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export function fail(res, status, message) {
  send(res, status, { errore: message });
}

// Legge il corpo della richiesta come Buffer (con limite di dimensione)
export async function readRaw(req, limit) {
  if (req.body !== undefined && req.body !== null) {
    const b = req.body;
    const buf = Buffer.isBuffer(b) ? b : typeof b === 'string' ? Buffer.from(b) : Buffer.from(JSON.stringify(b));
    if (buf.length > limit) throw httpError(413, 'File troppo grande');
    return buf;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw httpError(413, 'File troppo grande');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req, limit = MAX_JSON) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const buf = await readRaw(req, limit);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw httpError(400, 'Richiesta non valida');
  }
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Le richieste che modificano qualcosa devono arrivare dal pannello (protezione CSRF)
export function checkOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  if (req.headers['x-requested-with'] !== 'unisono-admin') throw httpError(403, 'Richiesta non consentita');
}

// Restituisce l'utente collegato oppure lancia un errore 401
export async function requireUser(req) {
  checkOrigin(req);
  const session = readSession(req);
  if (!session) throw httpError(401, 'Accesso richiesto');
  if (!(await userExists(session.u))) throw httpError(401, 'Utente non più attivo');
  return session.u;
}

// Avvolge un handler gestendo gli errori in modo uniforme
export function handler(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) return fail(res, 405, 'Metodo non consentito');
    try {
      await fn(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      fail(res, status, status >= 500 ? (err.publicMessage || 'Errore del server, riprova tra poco') : err.message);
    }
  };
}
