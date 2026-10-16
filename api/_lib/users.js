// Utenti del pannello.
//
// - L'amministratore principale è definito dalle variabili ADMIN_USER e ADMIN_PASSWORD su Vercel
//   (non si può eliminare dal pannello: serve anche per rientrare se si perde una password).
// - Gli altri utenti sono salvati in content/utenti.enc.json, cifrato con SESSION_SECRET:
//   il repository è pubblico, quindi nomi e password non devono essere leggibili.

import { verifyPassword, safeEqual, hashPassword } from './auth.js';
import { encryptJson, decryptJson } from './crypto.js';
import { getStore } from './store.js';
import { httpError } from './http.js';

export const USERS_PATH = 'content/utenti.enc.json';
const USERNAME_RE = /^[A-Za-z0-9._@-]{3,40}$/;
const CACHE_MS = 30 * 1000;

let cache = null; // { at, users, sha }

export function encryptUsers(users) {
  return encryptJson(users, 'utenti');
}

export function decryptUsers(text) {
  return decryptJson(text, 'utenti');
}

export function envAdmin() {
  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASSWORD;
  if (u && p) return { username: u, password: p };
  if (!process.env.VERCEL) return { username: 'admin', password: 'admin' }; // solo in locale
  return null;
}

export function invalidateUsersCache() {
  cache = null;
}

export async function loadUsers({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache;
  const file = await getStore().readText(USERS_PATH);
  let users = [];
  if (file) {
    try {
      users = decryptUsers(file.text);
    } catch {
      // SESSION_SECRET cambiato: gli utenti salvati non sono più leggibili.
      // Resta valido l'amministratore principale, che può ricrearli.
      users = [];
    }
  }
  cache = { at: Date.now(), users, sha: file ? file.sha : null };
  return cache;
}

export async function userExists(username) {
  const admin = envAdmin();
  if (admin && admin.username === username) return true;
  const { users } = await loadUsers();
  return users.some((u) => u.username === username);
}

export async function checkLogin(username, password) {
  const admin = envAdmin();
  if (admin && safeEqual(username, admin.username) && safeEqual(password, admin.password)) return admin.username;
  const { users } = await loadUsers({ fresh: true });
  const user = users.find((u) => u.username === username);
  if (user && verifyPassword(password, user.hash)) return user.username;
  return null;
}

export async function listUsers() {
  const admin = envAdmin();
  const { users } = await loadUsers({ fresh: true });
  return [
    ...(admin ? [{ username: admin.username, principale: true }] : []),
    ...users.map((u) => ({ username: u.username, principale: false, creato: u.creato })),
  ];
}

function validate(username, password) {
  if (!USERNAME_RE.test(username || '')) throw httpError(400, 'Il nome utente deve avere 3-40 caratteri: lettere, numeri, punto, trattino, @');
  if (password !== undefined && String(password).length < 8) throw httpError(400, 'La password deve avere almeno 8 caratteri');
}

async function save(users, sha, message) {
  await getStore().commit({
    files: [{ path: USERS_PATH, text: encryptUsers(users) }],
    message,
    expect: { [USERS_PATH]: sha },
  });
  invalidateUsersCache();
}

export async function addUser(username, password, by) {
  validate(username, password);
  const admin = envAdmin();
  const { users, sha } = await loadUsers({ fresh: true });
  if ((admin && admin.username === username) || users.some((u) => u.username === username)) {
    throw httpError(409, 'Esiste già un utente con questo nome');
  }
  users.push({ username, hash: hashPassword(password), creato: new Date().toISOString().slice(0, 10) });
  await save(users, sha, `Pannello: aggiunto un utente (da ${by})`);
}

export async function setPassword(username, password, by) {
  validate(username, password);
  const admin = envAdmin();
  if (admin && admin.username === username) {
    throw httpError(400, 'La password dell\'amministratore principale si cambia su Vercel (variabile ADMIN_PASSWORD)');
  }
  const { users, sha } = await loadUsers({ fresh: true });
  const user = users.find((u) => u.username === username);
  if (!user) throw httpError(404, 'Utente non trovato');
  user.hash = hashPassword(password);
  await save(users, sha, `Pannello: cambiata una password (da ${by})`);
}

export async function removeUser(username, by) {
  const admin = envAdmin();
  if (admin && admin.username === username) throw httpError(400, 'L\'amministratore principale non si può eliminare');
  const { users, sha } = await loadUsers({ fresh: true });
  const next = users.filter((u) => u.username !== username);
  if (next.length === users.length) throw httpError(404, 'Utente non trovato');
  await save(next, sha, `Pannello: eliminato un utente (da ${by})`);
}
