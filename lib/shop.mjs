// Logica comune dello shop: usata dal sito (carrello) e dal server (ordini).
// Il server ricalcola sempre i totali dai prodotti salvati: i prezzi inviati dal browser non contano.

export const CATEGORIE = [['vinile', 'Vinile'], ['cd', 'CD'], ['tshirt', 'T-shirt'], ['altro', 'Altro']];

export function formatEuro(value) {
  const n = Number(value) || 0;
  return '€ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Prezzo valido: numero positivo con al massimo due decimali
export function priceOf(prodotto) {
  const p = Number(prodotto && prodotto.prezzo);
  return Number.isFinite(p) && p > 0 ? Math.round(p * 100) / 100 : null;
}

export function variantOptions(prodotto) {
  return String((prodotto && prodotto.varianti) || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Si può comprare: visibile, disponibile, con prezzo e scorte (se gestite)
export function isBuyable(prodotto) {
  if (!prodotto || prodotto.visibile === false || prodotto.disponibile === false) return false;
  if (priceOf(prodotto) === null) return false;
  if (prodotto.scorte !== '' && prodotto.scorte !== null && prodotto.scorte !== undefined && Number(prodotto.scorte) <= 0) return false;
  return true;
}

export function shippingCost(impostazioni, consegna, subtotale) {
  if (consegna !== 'spedizione') return 0;
  const s = impostazioni || {};
  const gratisSopra = Number(s.spedizione_gratis_sopra) || 0;
  if (gratisSopra > 0 && subtotale >= gratisSopra) return 0;
  return Math.round((Number(s.spedizione_costo) || 0) * 100) / 100;
}

// righe: [{ id, variante, quantita }] -> { righe: [...con prezzo], subtotale, spedizione, totale, errori }
export function computeOrder(shop, righe, consegna) {
  const prodotti = (shop && shop.prodotti) || [];
  const errori = [];
  const out = [];
  const qtyById = {};
  for (const r of Array.isArray(righe) ? righe.slice(0, 50) : []) {
    const p = prodotti.find((x) => x.id === r.id);
    const quantita = Math.floor(Number(r.quantita));
    if (!p) { errori.push('Un articolo del carrello non è più disponibile'); continue; }
    if (!isBuyable(p)) { errori.push(`"${p.nome}" non è al momento acquistabile`); continue; }
    if (!(quantita >= 1 && quantita <= 20)) { errori.push(`Quantità non valida per "${p.nome}"`); continue; }
    const opzioni = variantOptions(p);
    const variante = opzioni.length ? String(r.variante || '') : '';
    if (opzioni.length && !opzioni.includes(variante)) { errori.push(`Scegli ${(p.nome_variante || 'la variante').toLowerCase()} per "${p.nome}"`); continue; }
    qtyById[p.id] = (qtyById[p.id] || 0) + quantita;
    const prezzo = priceOf(p);
    out.push({ id: p.id, nome: p.nome, variante, quantita, prezzo, importo: Math.round(prezzo * quantita * 100) / 100 });
  }
  for (const [id, q] of Object.entries(qtyById)) {
    const p = prodotti.find((x) => x.id === id);
    if (p.scorte !== '' && p.scorte !== null && p.scorte !== undefined && q > Number(p.scorte)) {
      errori.push(`Di "${p.nome}" ne restano solo ${Number(p.scorte)}`);
    }
  }
  const imp = (shop && shop.impostazioni) || {};
  if (consegna === 'ritiro' && imp.ritiro_attivo === false) errori.push('Il ritiro non è disponibile');
  if (consegna !== 'spedizione' && consegna !== 'ritiro') errori.push('Scegli spedizione o ritiro');
  const subtotale = Math.round(out.reduce((t, r) => t + r.importo, 0) * 100) / 100;
  const spedizione = shippingCost(imp, consegna, subtotale);
  return { righe: out, subtotale, spedizione, totale: Math.round((subtotale + spedizione) * 100) / 100, errori };
}

export const STATI_ORDINE = [
  ['nuovo', 'Nuovo · in attesa del bonifico'],
  ['pagato', 'Pagato'],
  ['spedito', 'Spedito / consegnato'],
  ['annullato', 'Annullato'],
];
