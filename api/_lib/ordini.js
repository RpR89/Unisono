// Ordini dello shop: salvati cifrati in content/ordini/ (il repository è pubblico).

import { randomBytes } from 'node:crypto';
import { getStore } from './store.js';
import { encryptJson, decryptJson } from './crypto.js';
import { httpError } from './http.js';
import { computeOrder } from '../../lib/shop.mjs';

export const ORDERS_DIR = 'content/ordini';
export const SHOP_PATH = 'content/shop.json';
const NUMERO_RE = /^U\d{6}-[A-Z0-9]{4}$/;

const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function newNumero(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = [...randomBytes(4)].map((b) => alphabet[b % alphabet.length]).join('');
  return `U${ymd}-${rnd}`;
}

export function orderPath(numero) {
  if (!NUMERO_RE.test(numero || '')) throw httpError(400, 'Numero d\'ordine non valido');
  return `${ORDERS_DIR}/${numero}.enc.json`;
}

async function loadShop(store) {
  const file = await store.readText(SHOP_PATH);
  if (!file) throw httpError(503, 'Lo shop non è disponibile');
  return { shop: JSON.parse(file.text), sha: file.sha };
}

// Controlla i dati del cliente e crea l'ordine (prezzi ricalcolati dal server)
export async function createOrder(body, now = new Date()) {
  if (body.sito_web) throw httpError(400, 'Richiesta non valida'); // campo trappola per i robot
  const c = body.cliente || {};
  const cliente = { nome: clean(c.nome, 80), cognome: clean(c.cognome, 80), email: clean(c.email, 120), telefono: clean(c.telefono, 40) };
  if (!cliente.nome || !cliente.cognome) throw httpError(400, 'Inserisci nome e cognome');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) throw httpError(400, 'Controlla l\'indirizzo email');
  if (cliente.telefono.replace(/\D/g, '').length < 6) throw httpError(400, 'Controlla il numero di telefono');
  if (body.condizioni !== true) throw httpError(400, 'Devi accettare le condizioni di vendita');
  const consegna = body.consegna === 'ritiro' ? 'ritiro' : 'spedizione';
  const i = body.indirizzo || {};
  const indirizzo = consegna === 'spedizione'
    ? { via: clean(i.via, 150), cap: clean(i.cap, 5), citta: clean(i.citta, 80), provincia: clean(i.provincia, 2).toUpperCase() }
    : null;
  if (indirizzo && (!indirizzo.via || !/^\d{5}$/.test(indirizzo.cap) || !indirizzo.citta || !/^[A-Z]{2}$/.test(indirizzo.provincia))) {
    throw httpError(400, 'Controlla l\'indirizzo di spedizione');
  }

  const store = getStore();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { shop, sha } = await loadShop(store);
    const calc = computeOrder(shop, body.righe, consegna);
    if (calc.errori.length) throw httpError(400, calc.errori.join(' '));
    if (!calc.righe.length) throw httpError(400, 'Il carrello è vuoto');

    const numero = newNumero(now);
    const imp = shop.impostazioni || {};
    const ordine = {
      numero,
      data: now.toISOString(),
      stato: 'nuovo',
      cliente,
      consegna,
      indirizzo,
      note: clean(body.note, 1000),
      righe: calc.righe,
      subtotale: calc.subtotale,
      spedizione: calc.spedizione,
      totale: calc.totale,
      nota_interna: '',
    };

    // Le scorte (se indicate) scendono nello stesso salvataggio dell'ordine
    let shopChanged = false;
    for (const r of calc.righe) {
      const p = shop.prodotti.find((x) => x.id === r.id);
      if (p && p.scorte !== '' && p.scorte !== null && p.scorte !== undefined) {
        p.scorte = Math.max(0, Number(p.scorte) - r.quantita);
        shopChanged = true;
      }
    }
    const files = [{ path: orderPath(numero), text: encryptJson(ordine, 'ordini') }];
    if (shopChanged) files.push({ path: SHOP_PATH, text: JSON.stringify(shop, null, 2) + '\n' });
    try {
      await store.commit({ files, message: `Nuovo ordine dallo shop (${numero})`, expect: shopChanged ? { [SHOP_PATH]: sha } : {} });
    } catch (err) {
      if (err.status === 409 && attempt === 0) continue; // scorte cambiate nel frattempo: si ricalcola
      throw err;
    }
    return {
      numero,
      totale: calc.totale,
      bonifico: {
        intestatario: imp.intestatario || '',
        iban: imp.iban || '',
        banca: imp.banca || '',
        causale: String(imp.causale || 'Ordine {numero}').replace('{numero}', numero),
      },
    };
  }
  throw httpError(409, 'Riprova tra un momento');
}

export async function listOrders() {
  const store = getStore();
  const names = (await store.listDir(ORDERS_DIR)).filter((n) => /\.enc\.json$/.test(n));
  const orders = await Promise.all(names.map(async (name) => {
    const file = await store.readText(`${ORDERS_DIR}/${name}`);
    try {
      return file ? decryptJson(file.text, 'ordini') : null;
    } catch {
      return { numero: name.replace('.enc.json', ''), illeggibile: true };
    }
  }));
  return orders.filter(Boolean).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
}

export async function updateOrder(numero, changes, by) {
  const store = getStore();
  const path = orderPath(numero);
  const file = await store.readText(path);
  if (!file) throw httpError(404, 'Ordine non trovato');
  const ordine = decryptJson(file.text, 'ordini');
  if (changes.stato !== undefined) {
    if (!['nuovo', 'pagato', 'spedito', 'annullato'].includes(changes.stato)) throw httpError(400, 'Stato non valido');
    ordine.stato = changes.stato;
  }
  if (changes.nota_interna !== undefined) ordine.nota_interna = clean(changes.nota_interna, 2000);
  ordine.aggiornato = new Date().toISOString();
  ordine.aggiornato_da = by;
  await store.commit({
    files: [{ path, text: encryptJson(ordine, 'ordini') }],
    message: `Ordine ${numero} aggiornato dal pannello`,
    expect: { [path]: file.sha },
  });
  return ordine;
}
