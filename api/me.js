// GET /api/me -> utente collegato
import { handler, send, requireUser } from './_lib/http.js';

export default handler({
  async GET(req, res) {
    send(res, 200, { utente: await requireUser(req) });
  },
});
