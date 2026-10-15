// GET    /api/users                               -> elenco utenti
// POST   /api/users { username, password }        -> nuovo utente
// PATCH  /api/users { username, password }        -> nuova password
// DELETE /api/users?username=...                  -> elimina utente

import { handler, send, readJson, requireUser } from './_lib/http.js';
import { listUsers, addUser, setPassword, removeUser } from './_lib/users.js';

export default handler({
  async GET(req, res) {
    await requireUser(req);
    send(res, 200, { utenti: await listUsers() });
  },
  async POST(req, res) {
    const me = await requireUser(req);
    const { username, password } = await readJson(req, 10 * 1024);
    await addUser(String(username || '').trim(), password, me);
    send(res, 200, { utenti: await listUsers() });
  },
  async PATCH(req, res) {
    const me = await requireUser(req);
    const { username, password } = await readJson(req, 10 * 1024);
    await setPassword(String(username || ''), password, me);
    send(res, 200, { ok: true });
  },
  async DELETE(req, res) {
    const me = await requireUser(req);
    const username = new URL(req.url, 'http://localhost').searchParams.get('username');
    await removeUser(String(username || ''), me);
    send(res, 200, { utenti: await listUsers() });
  },
});
