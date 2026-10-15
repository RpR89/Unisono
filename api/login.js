// POST /api/login  { username, password }
import { handler, readJson, send, checkOrigin, httpError } from './_lib/http.js';
import { checkLogin } from './_lib/users.js';
import { createSessionToken, sessionCookie } from './_lib/auth.js';

export default handler({
  async POST(req, res) {
    checkOrigin(req);
    const { username, password } = await readJson(req, 10 * 1024);
    const user = typeof username === 'string' && typeof password === 'string'
      ? await checkLogin(username.trim(), password)
      : null;
    if (!user) {
      await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
      throw httpError(401, 'Nome utente o password non corretti');
    }
    send(res, 200, { utente: user }, { 'Set-Cookie': sessionCookie(req, createSessionToken(user)) });
  },
});
