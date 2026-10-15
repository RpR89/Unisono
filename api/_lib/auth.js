// Password e sessioni del pannello.

import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const COOKIE = 'unisono_admin';
const SESSION_HOURS = 12;

export function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL) {
    const err = new Error('SESSION_SECRET mancante o troppo corto');
    err.publicMessage = 'Configurazione mancante su Vercel: SESSION_SECRET (almeno 32 caratteri)';
    throw err;
  }
  return 'sviluppo-locale-non-usare-in-produzione-0123456789';
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// ----------------------------------------------------------------- Password

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [kind, saltB64, hashB64] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Confronto a tempo costante tra due stringhe qualsiasi
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// ----------------------------------------------------------------- Sessioni

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest();
}

export function createSessionToken(username, now = Date.now()) {
  const payload = b64url(JSON.stringify({ u: username, exp: now + SESSION_HOURS * 3600 * 1000 }));
  return `${payload}.${b64url(sign(payload))}`;
}

export function verifySessionToken(token, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  const given = Buffer.from(sig || '', 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.u || typeof data.exp !== 'number' || data.exp < now) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function readSession(req) {
  return verifySessionToken(parseCookies(req)[COOKIE]);
}

function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.VERCEL);
}

export function sessionCookie(req, token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${isHttps(req) ? '; Secure' : ''}`;
}

export function clearCookie(req) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isHttps(req) ? '; Secure' : ''}`;
}
