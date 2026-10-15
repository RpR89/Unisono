// POST /api/logout
import { handler, send, checkOrigin } from './_lib/http.js';
import { clearCookie } from './_lib/auth.js';

export default handler({
  async POST(req, res) {
    checkOrigin(req);
    send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) });
  },
});
