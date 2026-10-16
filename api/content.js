// GET /api/content  -> contenuti attuali { site, eventi, versione }
// PUT /api/content  { site, eventi, versione, files: [{ path, id }] } -> pubblica le modifiche

import { handler, send, readJson, requireUser, httpError } from './_lib/http.js';
import { getStore } from './_lib/store.js';
import { validateContent } from '../lib/validate.mjs';

const SITE = 'content/site.json';
const EVENTI = 'content/eventi.json';
const SHOP = 'content/shop.json';
const UPLOAD_PATH = /^assets\/uploads\/\d{4}\/\d{2}\/[a-z0-9-]+\.(jpg|jpeg|png|webp|gif|pdf)$/;

const toText = (data) => JSON.stringify(data, null, 2) + '\n';

export default handler({
  async GET(req, res) {
    await requireUser(req);
    const store = getStore();
    const [site, eventi, shop] = await Promise.all([store.readText(SITE), store.readText(EVENTI), store.readText(SHOP)]);
    if (!site || !eventi) throw httpError(500, 'File dei contenuti non trovati');
    send(res, 200, {
      site: JSON.parse(site.text),
      eventi: JSON.parse(eventi.text),
      shop: shop ? JSON.parse(shop.text) : { pagina: {}, impostazioni: {}, prodotti: [] },
      versione: { site: site.sha, eventi: eventi.sha, shop: shop ? shop.sha : null },
    });
  },

  async PUT(req, res) {
    const user = await requireUser(req);
    const body = await readJson(req);
    const content = { site: body.site, eventi: body.eventi, shop: body.shop };
    const errors = validateContent(content);
    if (errors.length) throw httpError(400, 'Controlla questi campi: ' + errors.join('; '));

    const files = [];
    for (const f of Array.isArray(body.files) ? body.files : []) {
      if (!f || !UPLOAD_PATH.test(f.path || '') || typeof f.id !== 'string') throw httpError(400, 'File caricato non valido');
      files.push({ path: f.path, upload: f.id });
    }
    const versione = body.versione || {};
    const siteText = toText(content.site);
    const eventiText = toText(content.eventi);
    const shopText = toText(content.shop);

    const store = getStore();
    const result = await store.commit({
      files: [...files, { path: SITE, text: siteText }, { path: EVENTI, text: eventiText }, { path: SHOP, text: shopText }],
      message: `Contenuti aggiornati dal pannello (${user})`,
      // Lo shop cambia anche quando arriva un ordine (scorte): così non si sovrascrivono
      expect: { [SITE]: versione.site, [EVENTI]: versione.eventi, [SHOP]: versione.shop ?? null },
    });

    const { gitBlobSha } = await import('./_lib/store.js');
    send(res, 200, {
      ok: true,
      commit: result.commit,
      versione: { site: gitBlobSha(siteText), eventi: gitBlobSha(eventiText), shop: gitBlobSha(shopText) },
    });
  },
});
