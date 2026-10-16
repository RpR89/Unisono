// Carrello dello shop: aggiunta degli articoli, riepilogo, invio dell'ordine.
// Il carrello resta salvato nel browser (localStorage) finché non si invia l'ordine.

import { computeOrder, formatEuro, variantOptions } from '../lib/shop.mjs';

const KEY = 'unisono-carrello';
const dataEl = document.getElementById('shop-data');
const shop = dataEl ? JSON.parse(dataEl.textContent) : { prodotti: [], impostazioni: {} };
const byId = (id) => shop.prodotti.find((p) => p.id === id);

function load() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter((r) => byId(r.id)) : [];
  } catch {
    return [];
  }
}

function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* navigazione privata */ }
  updateBadge();
}

export function updateBadge() {
  const n = load().reduce((t, r) => t + r.quantita, 0);
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = n;
    el.hidden = n === 0;
  });
}

function toast(message) {
  let t = document.querySelector('.shop-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'shop-toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.innerHTML = message;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 4000);
}

function add(id, variante, quantita) {
  const items = load();
  const found = items.find((r) => r.id === id && r.variante === variante);
  if (found) found.quantita = Math.min(20, found.quantita + quantita);
  else items.push({ id, variante, quantita });
  save(items);
  const p = byId(id);
  const cartUrl = (document.querySelector('.cart-link') || {}).href || 'carrello/';
  toast(`<strong>${escapeHtml(p ? p.nome : 'Articolo')}</strong> aggiunto al carrello. <a href="${cartUrl}">Vai al carrello →</a>`);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

// ---------------------------------------------------------------- Pagine shop e prodotto

document.querySelectorAll('.add-to-cart').forEach((btn) => {
  btn.addEventListener('click', () => add(btn.dataset.id, '', 1));
});

document.querySelectorAll('.buy-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const variante = form.variante ? form.variante.value : '';
    if (form.variante && !variante) { form.variante.focus(); return; }
    const q = Math.max(1, Math.min(20, parseInt(form.quantita.value, 10) || 1));
    add(form.dataset.id, variante, q);
  });
});

document.querySelectorAll('.product-thumbs button').forEach((b) => {
  b.addEventListener('click', () => {
    const main = document.querySelector('.product-main img');
    if (main) { main.removeAttribute('srcset'); main.src = b.dataset.src; }
    document.querySelectorAll('.product-thumbs button').forEach((x) => x.classList.toggle('active', x === b));
  });
});

// ---------------------------------------------------------------- Carrello e ordine

const itemsEl = document.getElementById('cart-items');
const form = document.getElementById('checkout');

function renderCart() {
  const items = load();
  const consegna = form ? (form.consegna.value || 'spedizione') : 'spedizione';
  const order = computeOrder(shop, items, consegna);
  if (!items.length) {
    itemsEl.innerHTML = `<p class="cart-empty">Il carrello è vuoto. <a href="${escapeHtml((document.querySelector('.main-nav a[href*="shop/index"]') || {}).href || '../index.html')}">Vai allo shop →</a></p>`;
    form.hidden = true;
    return;
  }
  form.hidden = false;
  itemsEl.innerHTML = items.map((r, i) => {
    const p = byId(r.id);
    const opzioni = variantOptions(p);
    return `<div class="cart-row">
      <a href="${escapeHtml(p.url)}" class="cart-img">${p.immagine ? `<img src="${escapeHtml(p.immagine)}" alt="">` : ''}</a>
      <div class="cart-name">
        <a href="${escapeHtml(p.url)}"><strong>${escapeHtml(p.nome)}</strong></a>
        ${opzioni.length ? `<small>${escapeHtml(p.nome_variante || 'Variante')}: ${escapeHtml(r.variante)}</small>` : ''}
        <small>${p.prezzo === null ? 'Prezzo in arrivo' : formatEuro(p.prezzo)}</small>
      </div>
      <div class="cart-qty">
        <button type="button" data-act="minus" data-i="${i}" aria-label="Togli uno">−</button>
        <span>${r.quantita}</span>
        <button type="button" data-act="plus" data-i="${i}" aria-label="Aggiungi uno">+</button>
      </div>
      <strong class="cart-sum">${p.prezzo === null ? '—' : formatEuro(p.prezzo * r.quantita)}</strong>
      <button type="button" class="cart-remove" data-act="remove" data-i="${i}" aria-label="Togli dal carrello">✕</button>
    </div>`;
  }).join('');

  const ship = form.querySelector('[data-ship-cost]');
  if (ship) {
    const cost = computeOrder(shop, items, 'spedizione').spedizione;
    ship.textContent = cost ? formatEuro(cost) : 'Gratis';
  }
  document.getElementById('address').hidden = consegna !== 'spedizione';
  document.getElementById('totals').innerHTML = `
    <div><span>Articoli</span><span>${formatEuro(order.subtotale)}</span></div>
    <div><span>${consegna === 'spedizione' ? 'Spedizione' : 'Ritiro'}</span><span>${order.spedizione ? formatEuro(order.spedizione) : 'Gratis'}</span></div>
    <div class="grand"><span>Totale</span><span>${formatEuro(order.totale)}</span></div>
    ${order.errori.length ? `<p class="form-error">${order.errori.map(escapeHtml).join('<br>')}</p>` : ''}`;
}

if (itemsEl && form) {
  itemsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const items = load();
    const r = items[Number(b.dataset.i)];
    if (!r) return;
    if (b.dataset.act === 'plus') r.quantita = Math.min(20, r.quantita + 1);
    if (b.dataset.act === 'minus') r.quantita -= 1;
    if (b.dataset.act === 'remove' || r.quantita < 1) items.splice(Number(b.dataset.i), 1);
    save(items);
    renderCart();
  });
  form.addEventListener('change', (e) => { if (e.target.name === 'consegna') renderCart(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('checkout-error');
    err.textContent = '';
    const f = form.elements;
    const consegna = f.consegna.value;
    const required = ['nome', 'cognome', 'email', 'telefono', ...(consegna === 'spedizione' ? ['via', 'cap', 'citta', 'provincia'] : [])];
    const missing = required.filter((k) => !String(f[k].value).trim());
    if (missing.length) { err.textContent = 'Compila tutti i campi richiesti.'; f[missing[0]].focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) { err.textContent = 'Controlla l\'indirizzo email.'; f.email.focus(); return; }
    if (consegna === 'spedizione' && !/^\d{5}$/.test(f.cap.value.trim())) { err.textContent = 'Il CAP deve avere 5 cifre.'; f.cap.focus(); return; }
    if (!f.condizioni.checked) { err.textContent = 'Per inviare l\'ordine accetta le condizioni di vendita.'; return; }
    const items = load();
    const order = computeOrder(shop, items, consegna);
    if (order.errori.length) { err.textContent = order.errori.join(' '); return; }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Invio in corso…';
    try {
      const res = await fetch('/api/ordine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: { nome: f.nome.value, cognome: f.cognome.value, email: f.email.value, telefono: f.telefono.value },
          consegna,
          indirizzo: { via: f.via.value, cap: f.cap.value, citta: f.citta.value, provincia: f.provincia.value },
          note: f.note.value,
          righe: items,
          condizioni: true,
          sito_web: f.sito_web.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.errore || 'Invio non riuscito, riprova tra poco.');
      save([]);
      showConfirm(data, f.nome.value.trim());
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = 'Invia l\'ordine';
    }
  });

  renderCart();
}

function showConfirm(data, nome) {
  document.getElementById('cart-view').hidden = true;
  document.querySelector('.cart-page .sec-head').hidden = true;
  const box = document.getElementById('confirm');
  box.hidden = false;
  const set = (k, v) => { const el = box.querySelector(`[data-c="${k}"]`); if (el) el.textContent = v; };
  const b = data.bonifico || {};
  set('nome', nome);
  set('numero', data.numero);
  set('totale', formatEuro(data.totale));
  set('intestatario', b.intestatario || '—');
  set('iban', b.iban || 'in arrivo');
  set('banca', b.banca || '—');
  set('causale', b.causale || data.numero);
  box.querySelector('[data-c="nota-iban"]').hidden = Boolean(b.iban);
  const cfg = JSON.parse((document.getElementById('shop-config') || {}).textContent || '{}');
  const testo = `Ciao, ho appena fatto l'ordine ${data.numero} sul sito (totale ${formatEuro(data.totale)}).`;
  const wa = box.querySelector('[data-c="wa"]');
  if (wa && cfg.wa) wa.href = `${cfg.wa}?text=${encodeURIComponent(testo)}`;
  window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 100 });
}

updateBadge();
