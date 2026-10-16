// GET   /api/ordini                              -> elenco degli ordini (pannello)
// PATCH /api/ordini { numero, stato, nota_interna } -> aggiorna un ordine

import { handler, send, readJson, requireUser } from './_lib/http.js';
import { listOrders, updateOrder } from './_lib/ordini.js';

export default handler({
  async GET(req, res) {
    await requireUser(req);
    send(res, 200, { ordini: await listOrders() });
  },
  async PATCH(req, res) {
    const me = await requireUser(req);
    const body = await readJson(req, 16 * 1024);
    send(res, 200, { ordine: await updateOrder(String(body.numero || ''), body, me) });
  },
});
