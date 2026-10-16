// POST /api/ordine -> nuovo ordine dallo shop (aperto a tutti i visitatori)

import { handler, send, readJson } from './_lib/http.js';
import { createOrder } from './_lib/ordini.js';

export default handler({
  async POST(req, res) {
    const body = await readJson(req, 32 * 1024);
    send(res, 200, await createOrder(body));
  },
});
