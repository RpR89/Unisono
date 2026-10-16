// Pannello di gestione dei contenuti di UNISONO Factory.

import { renderPage, slugify, RESERVED_SLUGS, eventPath, sortEvents, formatDateRange, isPast, todayInItaly } from '/lib/render.mjs';
import { SECTIONS, EVENT_FIELDS, LINK_OPTIONS, SHOP_SECTION, PRODUCT_FIELDS } from '/lib/schema.mjs';
import { formatEuro, STATI_ORDINE } from '/lib/shop.mjs';
import { sanitizeRich } from '/lib/sanitize.mjs';

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  user: null,
  draft: null,        // contenuti in modifica { site, eventi }
  saved: '',          // ultima versione pubblicata (JSON) per capire se ci sono modifiche
  versione: null,     // versione dei file su GitHub, per evitare di sovrascrivere modifiche altrui
  section: 'eventi',
  eventSlug: null,    // evento aperto nell'editor
  eventPreview: 'page',
  newSlugs: new Set(),
  uploads: new Map(), // file caricati ma non ancora pubblicati: path -> id
  localUrls: new Map(), // path -> URL locale per mostrare subito le immagini caricate
  device: window.innerWidth < 760 ? 'mobile' : 'desktop',
  anchor: null,
};

// ---------------------------------------------------------------- Comunicazione con il server

async function api(method, url, body, { raw = false, headers = {} } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'unisono-admin', ...headers } };
  if (body !== undefined) {
    if (raw) opts.body = body;
    else {
      opts.body = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
    }
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new Error('Connessione non riuscita. Controlla internet e riprova.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url !== '/api/login') {
    showLogin('La sessione è scaduta: accedi di nuovo. Le modifiche non pubblicate sono ancora qui.');
    throw new Error(data.errore || 'Accesso richiesto');
  }
  if (!res.ok) throw new Error(data.errore || `Errore ${res.status}`);
  return data;
}

// ---------------------------------------------------------------- Utility

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function plain(html, max = 70) {
  const t = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

let toastTimer;
function toast(message, { error = false, ms = 3500 } = {}) {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'toast' + (error ? ' err' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

function resolveAsset(path) {
  if (!path) return '';
  if (state.localUrls.has(path)) return state.localUrls.get(path);
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith('assets/uploads/')) return '/api/file?path=' + encodeURIComponent(path);
  return '/' + path;
}

// ---------------------------------------------------------------- Finestre di dialogo

function openDialog({ title, body, actions }) {
  const d = $('#dialog');
  d.innerHTML = '';
  return new Promise((resolve) => {
    const close = (value) => { d.close(); resolve(value); };
    d.append(
      el('div', { class: 'dialog-head' }, el('h2', { text: title }), el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => close(null), 'aria-label': 'Chiudi' }, '✕')),
      el('div', { class: 'dialog-body' }, body),
      actions ? el('div', { class: 'dialog-foot' }, actions.map((a) =>
        el('button', { class: 'btn ' + (a.class || ''), type: 'button', onclick: () => close(a.value) }, a.label))) : null,
    );
    d.onclose = () => resolve(null);
    d.showModal();
    d.__close = close;
  });
}

function confirmDialog(title, message, okLabel = 'Conferma', danger = false) {
  return openDialog({
    title,
    body: el('p', { text: message, style: { margin: 0, lineHeight: 1.5 } }),
    actions: [{ label: 'Annulla', value: false, class: 'btn-ghost' }, { label: okLabel, value: true, class: danger ? 'btn-primary' : 'btn-primary' }],
  }).then(Boolean);
}

async function inputDialog(title, label, value = '', placeholder = '') {
  const input = el('input', { type: 'text', value, placeholder, style: { width: '100%', padding: '10px', font: 'inherit', border: '1px solid #e2e3e7', borderRadius: '8px' } });
  const body = el('label', { style: { display: 'grid', gap: '6px', fontSize: '14px' } }, label, input);
  setTimeout(() => input.focus(), 50);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#dialog').__close('ok'); } });
  const r = await openDialog({ title, body, actions: [{ label: 'Annulla', value: null, class: 'btn-ghost' }, { label: 'OK', value: 'ok', class: 'btn-primary' }] });
  return r === 'ok' ? input.value.trim() : null;
}

// ---------------------------------------------------------------- Accesso

function showLogin(message = '') {
  $('#login').hidden = false;
  $('#app').hidden = true;
  $('#login-error').textContent = message;
  $('#login-form [name=password]').value = '';
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button');
  btn.disabled = true;
  $('#login-error').textContent = '';
  try {
    const data = await api('POST', '/api/login', { username: form.username.value, password: form.password.value });
    state.user = data.utente;
    await start();
  } catch (err) {
    $('#login-error').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$('#logout').addEventListener('click', async () => {
  if (isDirty() && !(await confirmDialog('Uscire?', 'Hai modifiche non pubblicate che andranno perse.', 'Esci senza pubblicare', true))) return;
  await api('POST', '/api/logout', {}).catch(() => {});
  state.saved = JSON.stringify(state.draft); // evita l'avviso di uscita
  location.reload();
});

async function start() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#me').textContent = state.user;
  if (!state.draft) {
    $('#editor').innerHTML = '<p class="loading">Caricamento dei contenuti…</p>';
    const data = await api('GET', '/api/content');
    state.draft = { site: data.site, eventi: data.eventi, shop: data.shop };
    state.saved = JSON.stringify(state.draft);
    state.versione = data.versione;
  }
  renderNav();
  showSection(state.section);
  refreshOrderBadge();
}

// ---------------------------------------------------------------- Navigazione

const NAV = [
  { id: 'eventi', titolo: 'Locandine ed eventi', icona: '▦' },
  ...SECTIONS.map((s) => ({ id: s.id, titolo: s.titolo, icona: s.icona })),
  { sep: true },
  { id: 'prodotti', titolo: 'Shop · Prodotti', icona: '♫' },
  { id: SHOP_SECTION.id, titolo: SHOP_SECTION.titolo, icona: SHOP_SECTION.icona },
  { id: 'ordini', titolo: 'Ordini', icona: '✉' },
  { sep: true },
  { id: 'utenti', titolo: 'Utenti', icona: '☺' },
];
const ALL_SECTIONS = [...SECTIONS, SHOP_SECTION];

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  for (const item of NAV) {
    if (item.sep) { nav.append(el('div', { class: 'sep' })); continue; }
    nav.append(el('button', {
      type: 'button',
      class: item.id === state.section ? 'active' : '',
      onclick: () => showSection(item.id),
    }, el('span', { class: 'ico', text: item.icona }), item.titolo,
      item.id === 'ordini' && state.nuoviOrdini ? el('span', { class: 'nav-badge', text: state.nuoviOrdini }) : null));
  }
}

function showSection(id, { eventSlug = null, productId = null } = {}) {
  state.section = id;
  state.eventSlug = eventSlug;
  state.productId = productId;
  state.anchor = null;
  $('#app').classList.remove('nav-open');
  renderNav();
  const editor = $('#editor');
  editor.innerHTML = '';
  editor.scrollTop = 0;
  if (id === 'eventi') {
    if (eventSlug) renderEventEditor(editor, eventSlug);
    else renderEventList(editor);
  } else if (id === 'utenti') {
    renderUsers(editor);
  } else if (id === 'prodotti') {
    if (productId) renderProductEditor(editor, productId);
    else renderProductList(editor);
  } else if (id === 'ordini') {
    renderOrders(editor);
  } else {
    renderSchemaSection(editor, ALL_SECTIONS.find((s) => s.id === id));
  }
  updatePreview(true);
}

$('#menu-btn').addEventListener('click', () => $('#app').classList.toggle('nav-open'));
$('#preview-toggle').addEventListener('click', () => {
  const on = $('#app').classList.toggle('show-preview');
  $('#preview-toggle').textContent = on ? 'Modifica' : 'Anteprima';
  if (on) updatePreview(true);
});
document.querySelectorAll('.topbar .device button').forEach((b) => b.addEventListener('click', () => {
  state.device = b.dataset.device;
  document.querySelectorAll('.topbar .device button').forEach((x) => x.classList.toggle('active', x === b));
  fitPreview();
}));

// Dimensiona l'anteprima: larghezza di un computer (1280px) o di un telefono (390px), in scala
function fitPreview() {
  const wrap = $('.preview-frame-wrap');
  const frame = $('#preview');
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  if (!W || !H) return;
  const pageWidth = state.device === 'mobile' ? 390 : 1280;
  const scale = Math.min(1, W / pageWidth);
  frame.style.width = pageWidth + 'px';
  frame.style.height = H / scale + 'px';
  frame.style.transform = `scale(${scale})`;
  frame.style.left = Math.max(0, (W - pageWidth * scale) / 2) + 'px';
}
document.querySelectorAll('.topbar .device button').forEach((x) => x.classList.toggle('active', x.dataset.device === state.device));
new ResizeObserver(fitPreview).observe($('.preview-frame-wrap'));

// ---------------------------------------------------------------- Modifiche e pubblicazione

function isDirty() {
  return state.draft && JSON.stringify(state.draft) !== state.saved;
}

function setStatus(text, cls = '') {
  const s = $('#status');
  s.textContent = text;
  s.className = 'status ' + cls;
}

function changed() {
  const dirty = isDirty();
  $('#publish').disabled = !dirty;
  $('#discard').disabled = !dirty;
  if (dirty) setStatus('Modifiche non pubblicate', 'dirty');
  else setStatus('Nessuna modifica');
  updatePreview();
}

window.addEventListener('beforeunload', (e) => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

$('#discard').addEventListener('click', async () => {
  if (!(await confirmDialog('Annullare le modifiche?', 'Tutte le modifiche fatte dall\'ultima pubblicazione andranno perse.', 'Annulla modifiche', true))) return;
  state.draft = JSON.parse(state.saved);
  for (const slug of state.newSlugs) if (!state.draft.eventi.eventi.some((e) => e.slug === slug)) state.newSlugs.delete(slug);
  const stillThere = state.eventSlug && state.draft.eventi.eventi.some((e) => e.slug === state.eventSlug);
  showSection(state.section, { eventSlug: stillThere ? state.eventSlug : null });
  changed();
});

function collectAssetPaths(value, out = new Set()) {
  if (typeof value === 'string') { if (value.startsWith('assets/')) out.add(value); }
  else if (Array.isArray(value)) value.forEach((v) => collectAssetPaths(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectAssetPaths(v, out));
  return out;
}

async function publish() {
  if (!isDirty()) return;
  const missing = state.draft.eventi.eventi.filter((e) => e.visibile !== false && !e.locandina);
  if (missing.length && !(await confirmDialog('Manca la locandina', `${missing.map((e) => e.titolo).join(', ')}: non hai ancora caricato la locandina. Pubblicare lo stesso?`, 'Pubblica lo stesso'))) return;

  const used = collectAssetPaths(state.draft);
  const files = [...state.uploads].filter(([path]) => used.has(path)).map(([path, id]) => ({ path, id }));
  const btn = $('#publish');
  btn.disabled = true;
  $('#discard').disabled = true;
  setStatus('Pubblicazione in corso…');
  try {
    const res = await api('PUT', '/api/content', { ...state.draft, versione: state.versione, files });
    state.versione = res.versione;
    state.saved = JSON.stringify(state.draft);
    state.uploads.clear();
    state.newSlugs.clear();
    state.newProducts?.clear();
    if (state.section === 'eventi') showSection('eventi', { eventSlug: state.eventSlug });
    setStatus('Pubblicato. Il sito online si aggiorna tra circa un minuto…', 'ok');
    toast('Modifiche pubblicate!');
    waitOnline(res.versione);
  } catch (err) {
    setStatus('Pubblicazione non riuscita', 'err');
    toast(err.message, { error: true, ms: 9000 });
    $('#publish').disabled = !isDirty();
    $('#discard').disabled = !isDirty();
  }
}

$('#publish').addEventListener('click', publish);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); publish(); }
});

// Controlla quando la nuova versione è davvero online
let onlineTimer;
function waitOnline(versione) {
  clearTimeout(onlineTimer);
  const started = Date.now();
  const check = async () => {
    if (isDirty()) return;
    try {
      const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
      const v = await res.json();
      if (v.site === versione.site && v.eventi === versione.eventi && (!versione.shop || v.shop === versione.shop)) {
        setStatus('Pubblicato e online ✓', 'ok');
        updatePreview();
        return;
      }
    } catch { /* riprova */ }
    if (Date.now() - started < 6 * 60 * 1000) onlineTimer = setTimeout(check, 8000);
    else setStatus('Pubblicato. Se il sito non è ancora aggiornato, controlla Vercel.', 'dirty');
  };
  onlineTimer = setTimeout(check, 15000);
}

// ---------------------------------------------------------------- Anteprima

const PREVIEW_HEAD = `<style>
.js .reveal{opacity:1!important;transform:none!important;transition:none!important}
.hero-bg,.hero-logo{animation:none!important}
html{scroll-behavior:auto!important}
</style>
<script>
document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();}},true);
document.addEventListener('submit',function(e){e.preventDefault();},true);
</script>`;

let previewTimer;
let previewId = null;
let pendingScroll = null;

function previewTarget() {
  if (state.section === 'utenti' || state.section === 'ordini') return null;
  if (state.section === 'prodotti') {
    const p = state.productId && state.draft.shop.prodotti.find((x) => x.id === state.productId);
    return p && p.visibile !== false ? 'prodotto:' + p.id : 'shop';
  }
  if (state.section === 'eventi') {
    if (state.eventSlug && state.eventPreview === 'page') return 'evento:' + state.eventSlug;
    return 'home';
  }
  return ALL_SECTIONS.find((s) => s.id === state.section)?.anteprima || 'home';
}

function updatePreview(now = false) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, now ? 0 : 250);
}

function renderPreview() {
  const frame = $('#preview');
  const id = previewTarget();
  if (!id || !state.draft) {
    previewId = null;
    frame.srcdoc = '<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:40vh">Nessuna anteprima per questa sezione</p>';
    return;
  }
  let html;
  try {
    html = renderPage(id, state.draft, { prefix: '/', resolve: resolveAsset });
  } catch (err) {
    frame.srcdoc = `<p style="font-family:sans-serif;color:#c00;padding:20px">${err.message}</p>`;
    return;
  }
  const win = frame.contentWindow;
  pendingScroll = id === previewId && win ? win.scrollY : null;
  previewId = id;
  frame.srcdoc = html.replace('</head>', PREVIEW_HEAD + '</head>');
}

$('#preview').addEventListener('load', () => {
  const win = $('#preview').contentWindow;
  if (!win) return;
  if (state.anchor) scrollPreviewTo(state.anchor, false);
  else if (pendingScroll) win.scrollTo(0, pendingScroll);
  pendingScroll = null;
});

function scrollPreviewTo(sel, setAnchor = true) {
  if (setAnchor) state.anchor = sel;
  const doc = $('#preview').contentDocument;
  const target = doc && doc.querySelector(sel);
  if (target) doc.defaultView.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + doc.defaultView.scrollY - 80) });
}

// ---------------------------------------------------------------- Caricamento file

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = $('#file-input');
    input.value = '';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

const MAX_SIDE = 2000;
const MAX_BYTES = 4 * 1024 * 1024;

// Riduce le immagini troppo grandi prima di caricarle
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Formato non supportato: usa JPG, PNG o WEBP');
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const big = Math.max(bitmap.width, bitmap.height) > MAX_SIDE;
  if (!big && file.size <= 500 * 1024) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // WEBP: file leggeri e conserva le parti trasparenti dei loghi. Se il browser non lo supporta, JPEG.
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
  return blob.size < file.size ? blob : file;
}

async function uploadFile(kind) {
  const file = await pickFile(kind === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp,image/gif');
  if (!file) return null;
  return uploadBlob(file, kind);
}

async function uploadBlob(file, kind) {
  toast('Caricamento in corso…', { ms: 0 });
  document.body.classList.add('busy');
  try {
    let blob = file;
    if (kind === 'pdf') {
      if (file.type !== 'application/pdf') throw new Error('Il file deve essere un PDF');
    } else {
      blob = await prepareImage(file);
    }
    if (blob.size > MAX_BYTES) {
      throw new Error(kind === 'pdf'
        ? 'Il PDF supera 4 MB. Riducilo (ad esempio con ilovepdf.com → Comprimi PDF) e riprova.'
        : 'L\'immagine è troppo pesante anche dopo la riduzione. Prova con un file più piccolo.');
    }
    const data = await api('POST', '/api/upload', blob, {
      raw: true,
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name || 'immagine') },
    });
    state.uploads.set(data.path, data.id);
    state.localUrls.set(data.path, URL.createObjectURL(blob));
    toast('File caricato. Ricordati di pubblicare.');
    return data.path;
  } catch (err) {
    toast(err.message, { error: true, ms: 8000 });
    return null;
  } finally {
    document.body.classList.remove('busy');
  }
}

// Scelta tra le immagini già presenti nel sito
async function chooseFromLibrary() {
  const paths = [...collectAssetPaths(state.draft), ...state.localUrls.keys()]
    .filter((p) => /\.(jpe?g|png|webp|gif)$/i.test(p));
  const unique = [...new Set(paths)];
  const grid = el('div', { class: 'library' }, unique.map((p) => el('button', {
    type: 'button',
    title: p.split('/').pop(),
    style: { backgroundImage: `url("${resolveAsset(p)}")` },
    onclick: () => $('#dialog').__close(p),
  })));
  return openDialog({ title: 'Scegli un\'immagine già presente', body: grid, actions: [{ label: 'Annulla', value: null, class: 'btn-ghost' }] });
}

// ---------------------------------------------------------------- Campi del modulo

function field(def, value, onChange) {
  const label = def.label;
  switch (def.tipo) {
    case 'text':
    case 'url': {
      const input = el('input', { type: 'text', value: value ?? '', placeholder: def.tipo === 'url' ? 'https://…' : '' });
      input.addEventListener('input', () => onChange(input.value));
      return wrap(label, input, def.aiuto);
    }
    case 'lines': {
      const ta = el('textarea', { rows: Math.max(2, String(value ?? '').split('\n').length + 1) });
      ta.value = value ?? '';
      ta.addEventListener('input', () => onChange(ta.value));
      return wrap(label + ' (vai a capo per spezzare le righe)', ta, def.aiuto);
    }
    case 'rich':
      return wrap(label, richEditor(value, onChange), def.aiuto);
    case 'image':
      return wrap(label, mediaField(def, value, onChange, 'image'), def.aiuto);
    case 'pdf':
      return wrap(label, mediaField(def, value, onChange, 'pdf'), def.aiuto);
    case 'images':
      return wrap(label, galleryField(def, value || [], onChange), def.aiuto);
    case 'number': {
      const input = el('input', { type: 'number', min: '0', step: '0.01', value: value ?? '', inputmode: 'decimal' });
      input.addEventListener('input', () => onChange(input.value === '' ? '' : Number(input.value)));
      return wrap(label, input, def.aiuto);
    }
    case 'date': {
      const input = el('input', { type: 'date', value: value || '' });
      input.addEventListener('change', () => onChange(input.value));
      const clear = el('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { input.value = ''; onChange(''); } }, 'Togli data');
      return wrap(label, el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, input, clear), def.aiuto);
    }
    case 'select': {
      const sel = el('select', {}, def.opzioni.map(([v, t]) => el('option', { value: v, selected: v === value }, t)));
      sel.addEventListener('change', () => onChange(sel.value));
      return wrap(label, sel, def.aiuto);
    }
    case 'bool': {
      const cb = el('input', { type: 'checkbox', checked: value !== false });
      cb.addEventListener('change', () => onChange(cb.checked));
      return el('div', { class: 'field' }, el('label', { class: 'check' }, cb, label));
    }
    case 'link':
      return wrap(label, linkField(value, onChange), def.aiuto);
    case 'list':
      return wrap(label, listField(def, value || [], onChange), def.aiuto);
  }
  return el('div');
}

function wrap(label, control, help) {
  return el('div', { class: 'field' }, el('span', { class: 'label', text: label }), control, help ? el('p', { class: 'help', text: help }) : null);
}

function linkField(value, onChange) {
  const known = LINK_OPTIONS.some(([v]) => v === (value || ''));
  const sel = el('select', {},
    LINK_OPTIONS.map(([v, t]) => el('option', { value: v, selected: known && v === (value || '') }, t)),
    el('option', { value: '__url', selected: !known }, 'Indirizzo web…'));
  const input = el('input', { type: 'text', value: known ? '' : value, placeholder: 'https://…', hidden: known });
  sel.addEventListener('change', () => {
    input.hidden = sel.value !== '__url';
    onChange(sel.value === '__url' ? input.value : sel.value);
    if (!input.hidden) input.focus();
  });
  input.addEventListener('input', () => onChange(input.value));
  return el('div', { style: { display: 'grid', gap: '6px' } }, sel, input);
}

function mediaField(def, value, onChange, kind) {
  const box = el('div');
  const draw = (v) => {
    box.innerHTML = '';
    const thumb = kind === 'pdf'
      ? el('div', { class: 'thumb' + (v ? ' has' : ''), style: { color: v ? '#fff' : '' } }, v ? 'PDF' : 'Nessun file')
      : el('div', { class: 'thumb' + (v ? ' has' : ''), style: v ? { backgroundImage: `url("${resolveAsset(v)}")` } : {} }, v ? '' : 'Nessuna immagine');
    const set = (p) => { onChange(p); draw(p); };
    const actions = el('div', { class: 'media-actions' },
      el('button', { type: 'button', class: 'btn btn-sm', onclick: async () => { const p = await uploadFile(kind); if (p) set(p); } },
        v ? (kind === 'pdf' ? 'Sostituisci PDF' : 'Cambia immagine') : (kind === 'pdf' ? 'Carica PDF' : 'Carica immagine')),
      kind === 'image' ? el('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: async () => { const p = await chooseFromLibrary(); if (p) set(p); } }, 'Già caricate') : null,
      v && kind === 'pdf' ? el('a', { class: 'btn btn-sm btn-ghost', href: resolveAsset(v), target: '_blank', rel: 'noopener' }, 'Apri') : null,
      v && def.facoltativo ? el('button', { type: 'button', class: 'btn btn-sm btn-ghost btn-danger', onclick: () => set('') }, 'Rimuovi') : null,
    );
    box.append(el('div', { class: 'media' }, thumb, el('div', {}, actions, v ? el('div', { class: 'media-name', text: v.split('/').pop() }) : null)));
  };
  draw(value);
  enableDrop(box, kind, (p) => { onChange(p); draw(p); });
  return box;
}

function galleryField(def, images, onChange) {
  const box = el('div');
  const list = [...images];
  const commit = () => { onChange([...list]); draw(); };
  const draw = () => {
    box.innerHTML = '';
    const grid = el('div', { class: 'gallery-grid' });
    list.forEach((p, i) => {
      grid.append(el('div', { class: 'gallery-item' },
        el('div', { class: 'thumb has', style: { backgroundImage: `url("${resolveAsset(p)}")`, backgroundSize: 'cover' } }),
        el('div', { class: 'mini' },
          i > 0 ? el('button', { type: 'button', title: 'Sposta prima', onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; commit(); } }, '◀') : null,
          i < list.length - 1 ? el('button', { type: 'button', title: 'Sposta dopo', onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; commit(); } }, '▶') : null,
          el('button', { type: 'button', title: 'Togli', onclick: () => { list.splice(i, 1); commit(); } }, '✕'),
        )));
    });
    if (!def.max || list.length < def.max) {
      grid.append(el('button', { type: 'button', class: 'add-tile', onclick: async () => { const p = await uploadFile('image'); if (p) { list.push(p); commit(); } } }, '+ Aggiungi foto'));
    }
    box.append(grid);
  };
  draw();
  enableDrop(box, 'image', (p) => { if (!def.max || list.length < def.max) { list.push(p); commit(); } });
  return box;
}

function enableDrop(node, kind, onPath) {
  node.addEventListener('dragover', (e) => { e.preventDefault(); node.classList.add('drop-hint'); });
  node.addEventListener('dragleave', () => node.classList.remove('drop-hint'));
  node.addEventListener('drop', async (e) => {
    e.preventDefault();
    node.classList.remove('drop-hint');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const p = await uploadBlob(file, kind);
    if (p) onPath(p);
  });
}

function listField(def, items, onChange) {
  const box = el('div', { class: 'list' });
  const list = items.map((x) => x);
  const commit = (redraw = false) => { onChange(list.map((x) => x)); if (redraw) draw(); };
  const label = (item, i) => plain(item[def.etichetta]) || `Elemento ${i + 1}`;
  const draw = (openIndex = -1) => {
    box.innerHTML = '';
    list.forEach((item, i) => {
      const title = el('span', { class: 't', text: label(item, i) });
      const det = el('details', { class: 'item', open: i === openIndex },
        el('summary', {}, title,
          el('span', { class: 'mini' },
            i > 0 ? el('button', { type: 'button', title: 'Sposta su', onclick: (e) => { e.preventDefault(); [list[i - 1], list[i]] = [list[i], list[i - 1]]; commit(); draw(i - 1); } }, '▲') : null,
            i < list.length - 1 ? el('button', { type: 'button', title: 'Sposta giù', onclick: (e) => { e.preventDefault(); [list[i + 1], list[i]] = [list[i], list[i + 1]]; commit(); draw(i + 1); } }, '▼') : null,
            el('button', { type: 'button', title: 'Elimina', onclick: async (e) => {
              e.preventDefault();
              if (await confirmDialog('Eliminare?', `"${label(item, i)}" verrà tolto dalla pagina.`, 'Elimina', true)) { list.splice(i, 1); commit(); draw(); }
            } }, '✕'))),
        el('div', { class: 'item-body' }, def.campi.map((f) => field(f, item[f.k], (v) => {
          list[i] = { ...list[i], [f.k]: v };
          if (f.k === def.etichetta) title.textContent = label(list[i], i);
          commit();
        }))));
      box.append(det);
    });
    box.append(el('button', { type: 'button', class: 'btn btn-sm', onclick: () => {
      list.push(structuredClone(def.nuovo || {}));
      commit();
      draw(list.length - 1);
    } }, '+ Aggiungi'));
  };
  draw();
  return box;
}

// Editor di testo formattato
let savedRange = null;
function richEditor(value, onChange) {
  const area = el('div', { class: 'rich-area', contenteditable: 'true', html: sanitizeRich(value || '') });
  const exec = (cmd, arg = null) => { area.focus(); document.execCommand(cmd, false, arg); emit(); };
  const emit = () => onChange(sanitizeRich(area.innerHTML));
  const block = (tag) => {
    area.focus();
    const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
    document.execCommand('formatBlock', false, current === tag ? 'p' : tag);
    emit();
  };
  const tools = [
    ['G', 'Grassetto', () => exec('bold'), { fontWeight: '700' }],
    ['C', 'Corsivo', () => exec('italic'), { fontStyle: 'italic' }],
    ['Titolo', 'Titolo grande', () => block('h2')],
    ['Sottotitolo', 'Titolo piccolo', () => block('h3')],
    ['• Elenco', 'Elenco puntato', () => exec('insertUnorderedList')],
    ['Link', 'Aggiungi un link al testo selezionato', async () => {
      const sel = window.getSelection();
      savedRange = sel.rangeCount && area.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
      if (!savedRange || savedRange.collapsed) { toast('Prima seleziona le parole da trasformare in link'); return; }
      const url = await inputDialog('Aggiungi un link', 'Indirizzo (sito, email o telefono)', 'https://');
      if (!url || url === 'https://') return;
      area.focus();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      let href = url;
      if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(url)) href = 'mailto:' + url;
      else if (/^\+?[0-9 ]{6,}$/.test(url)) href = 'tel:' + url.replace(/\s/g, '');
      else if (!/^(https?:|mailto:|tel:)/i.test(url)) href = 'https://' + url;
      document.execCommand('createLink', false, href);
      emit();
    }],
    ['Togli link', 'Togli il link', () => exec('unlink')],
    ['Pulisci', 'Togli la formattazione dal testo selezionato', () => exec('removeFormat')],
  ];
  const bar = el('div', { class: 'rich-toolbar' }, tools.map(([t, title, fn, style]) => el('button', {
    type: 'button', title, style, onmousedown: (e) => e.preventDefault(), onclick: fn,
  }, t)));
  area.addEventListener('input', emit);
  area.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  area.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  });
  return el('div', { class: 'rich' }, bar, area);
}

// ---------------------------------------------------------------- Sezioni del sito

function setTitle(text) {
  $('#page-title').textContent = text;
  document.title = `${text} – Pannello UNISONO`;
}

function renderSchemaSection(root, section) {
  setTitle(section.titolo);
  root.append(el('p', { class: 'intro', text: 'Apri una sezione e modifica i campi: l\'anteprima a destra si aggiorna subito. Quando hai finito premi "Pubblica".' }));
  section.gruppi.forEach((g, gi) => {
    const base = section.root ? state.draft[section.root] : state.draft.site;
    const data = g.path ? getPath(base, g.path) : base;
    const body = el('div', { class: 'group-body' },
      g.aiuto ? el('p', { class: 'help', text: g.aiuto }) : null,
      g.campi.map((f) => field(f, data[f.k], (v) => { data[f.k] = v; changed(); })));
    const det = el('details', { class: 'group', open: gi === 0 }, el('summary', { text: g.titolo }), body);
    det.addEventListener('toggle', () => { if (det.open) scrollPreviewTo(g.sel); });
    det.addEventListener('focusin', () => { if (state.anchor !== g.sel) scrollPreviewTo(g.sel); });
    root.append(det);
  });
}

// ---------------------------------------------------------------- Locandine ed eventi

function events() {
  return state.draft.eventi.eventi;
}

function uniqueSlug(base, except) {
  let slug = slugify(base);
  if (RESERVED_SLUGS.has(slug)) slug += '-evento';
  let n = 2;
  const taken = (s) => events().some((e) => e.slug === s && e !== except);
  const start = slug;
  while (taken(slug)) slug = `${start}-${n++}`;
  return slug;
}

function contactsHtml() {
  const c = state.draft.site.contatti;
  return `<p>Per informazioni:</p><p>${c.telefono}</p><p><a href="mailto:${c.email}">${c.email}</a></p><p>www.unisonofactory.com</p>`;
}

function addEvent(tipo) {
  const titolo = tipo === 'novita' ? 'Nuova novità' : 'Nuovo evento';
  const ev = {
    slug: uniqueSlug(titolo),
    tipo,
    visibile: true,
    titolo,
    locandina: '',
    immagine_home: '',
    sottotitolo: '',
    data: '',
    data_fine: '',
    orario: tipo === 'novita' ? '' : 'ore 21.30',
    luogo: tipo === 'novita' ? '' : 'Modern Hall',
    testo: `<h2>${titolo.toUpperCase()}</h2><p>Descrizione dell'evento: musicisti, programma, prezzo.</p>${contactsHtml()}`,
  };
  const list = events();
  const firstSame = list.findIndex((e) => (e.tipo === 'novita') === (tipo === 'novita'));
  list.splice(firstSame === -1 ? list.length : firstSame, 0, ev);
  state.newSlugs.add(ev.slug);
  changed();
  showSection('eventi', { eventSlug: ev.slug });
}

function moveEvent(ev, dir) {
  const list = events();
  const i = list.indexOf(ev);
  const same = (e) => (e.tipo === 'novita') === (ev.tipo === 'novita');
  let j = i + dir;
  while (j >= 0 && j < list.length && !same(list[j])) j += dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  changed();
  showSection('eventi');
}

function renderEventList(root) {
  setTitle('Locandine ed eventi');
  root.append(
    el('p', { class: 'intro', text: 'Qui gestisci le locandine della Home. Ogni locandina apre la sua pagina con il testo dell\'evento. Gli eventi con la data si mettono in ordine da soli e, una volta conclusi, passano tra gli "Eventi passati". Per quelli senza data usa le frecce.' }),
    el('div', { class: 'ev-toolbar' },
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => addEvent('evento') }, '+ Nuovo evento'),
      el('button', { type: 'button', class: 'btn', onclick: () => addEvent('novita') }, '+ Nuova novità')),
  );
  const groups = [['evento', 'I prossimi eventi'], ['novita', 'Novità']];
  for (const [tipo, titolo] of groups) {
    const list = sortEvents(events().filter((e) => (e.tipo === 'novita') === (tipo === 'novita')));
    const today = todayInItaly();
    root.append(el('h2', { class: 'ev-section-title', text: `${titolo} (${list.length})` }));
    if (!list.length) { root.append(el('p', { class: 'help', text: 'Nessun elemento.' })); continue; }
    root.append(el('div', { class: 'ev-grid' }, list.map((ev, i) => el('div', {
      class: 'ev-card' + (ev.visibile === false ? ' hidden-ev' : ''),
      onclick: () => showSection('eventi', { eventSlug: ev.slug }),
    },
      el('div', { class: 'ev-poster', style: ev.locandina ? { backgroundImage: `url("${resolveAsset(ev.immagine_home || ev.locandina)}")` } : {} }, ev.locandina ? '' : 'Senza locandina'),
      el('div', { class: 'ev-info' },
        el('div', { class: 'ev-title', text: ev.titolo || '(senza titolo)' }),
        ev.data ? el('div', { class: 'ev-date', text: formatDateRange(ev.data, ev.data_fine, { weekday: false }) }) : null,
        el('div', { class: 'badges' },
          ev.visibile === false ? el('span', { class: 'badge off', text: 'Nascosto' }) : null,
          isPast(ev, today) ? el('span', { class: 'badge off', text: 'Concluso · in archivio' }) : null,
          tipo === 'evento' && !ev.data ? el('span', { class: 'badge off', text: 'Senza data' }) : null,
          state.newSlugs.has(ev.slug) ? el('span', { class: 'badge new', text: 'Da pubblicare' }) : null)),
      ev.data ? null : el('div', { class: 'ev-move' },
        el('button', { type: 'button', title: 'Sposta prima', disabled: i === 0, onclick: (e) => { e.stopPropagation(); moveEvent(ev, -1); } }, '◀'),
        el('button', { type: 'button', title: 'Sposta dopo', disabled: i === list.length - 1, onclick: (e) => { e.stopPropagation(); moveEvent(ev, 1); } }, '▶')),
    ))));
  }
}

function renderEventEditor(root, slug) {
  const ev = events().find((e) => e.slug === slug);
  if (!ev) return renderEventList(root);
  setTitle(ev.titolo || 'Evento');
  const url = el('p', { class: 'ev-url' });
  const drawUrl = () => {
    url.textContent = `Indirizzo della pagina: ${location.origin}/${eventPath(ev).replace(/index\.html$/, '')}` +
      (state.newSlugs.has(ev.slug) ? ' (si crea dal titolo)' : '');
  };
  drawUrl();

  const previewSwitch = el('div', { class: 'device', style: { marginBottom: '14px' } },
    [['page', 'Anteprima: pagina'], ['home', 'Anteprima: Home']].map(([v, t]) => el('button', {
      type: 'button', class: state.eventPreview === v ? 'active' : '',
      onclick: (e) => {
        state.eventPreview = v;
        previewSwitch.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === e.currentTarget));
        state.anchor = v === 'home' ? (ev.tipo === 'novita' ? '#novita' : '#events') : null;
        updatePreview(true);
      },
    }, t)));

  root.append(
    el('button', { type: 'button', class: 'btn btn-sm btn-ghost back', onclick: () => showSection('eventi') }, '← Tutte le locandine'),
    url,
    previewSwitch,
    el('div', { class: 'group' }, el('div', { class: 'group-body', style: { paddingTop: '16px' } },
      EVENT_FIELDS.map((f) => field(f, ev[f.k], (v) => {
        ev[f.k] = v;
        if (f.k === 'titolo') {
          setTitle(v || 'Evento');
          if (state.newSlugs.has(ev.slug)) {
            state.newSlugs.delete(ev.slug);
            ev.slug = uniqueSlug(v || 'evento', ev);
            state.newSlugs.add(ev.slug);
            state.eventSlug = ev.slug;
            drawUrl();
          }
        }
        changed();
      })))),
    el('div', { class: 'danger-zone' },
      el('button', { type: 'button', class: 'btn btn-danger', onclick: async () => {
        if (!(await confirmDialog('Eliminare questa locandina?', `"${ev.titolo}" e la sua pagina verranno tolti dal sito alla prossima pubblicazione. Se vuoi solo nasconderla, togli la spunta "Mostra nella Home".`, 'Elimina', true))) return;
        events().splice(events().indexOf(ev), 1);
        state.newSlugs.delete(ev.slug);
        changed();
        showSection('eventi');
      } }, 'Elimina locandina')),
  );
}

// ---------------------------------------------------------------- Utenti

async function renderUsers(root) {
  setTitle('Utenti');
  root.append(el('p', { class: 'intro', text: 'Le persone che possono entrare nel pannello. Tutti possono modificare tutto. Le modifiche agli utenti si salvano subito, senza premere "Pubblica".' }));
  const box = el('div', { class: 'users' }, el('p', { class: 'loading', text: 'Caricamento…' }));
  root.append(box);

  const draw = (utenti) => {
    box.innerHTML = '';
    for (const u of utenti) {
      box.append(el('div', { class: 'user-row' },
        el('span', { class: 'n' }, u.username, u.principale
          ? el('small', { text: 'Amministratore principale · la password si cambia su Vercel' })
          : (u.creato ? el('small', { text: `Aggiunto il ${u.creato.split('-').reverse().join('/')}` }) : null)),
        u.username === state.user ? el('span', { class: 'badge', text: 'Sei tu' }) : null,
        u.principale ? null : el('button', { type: 'button', class: 'btn btn-sm', onclick: async () => {
          const pw = await passwordDialog(`Nuova password per ${u.username}`);
          if (!pw) return;
          try {
            await api('PATCH', '/api/users', { username: u.username, password: pw });
            toast('Password cambiata');
          } catch (err) { toast(err.message, { error: true, ms: 7000 }); }
        } }, 'Cambia password'),
        u.principale ? null : el('button', { type: 'button', class: 'btn btn-sm btn-ghost btn-danger', onclick: async () => {
          if (!(await confirmDialog('Eliminare l\'utente?', `${u.username} non potrà più entrare nel pannello.`, 'Elimina', true))) return;
          try {
            const data = await api('DELETE', '/api/users?username=' + encodeURIComponent(u.username));
            draw(data.utenti);
            toast('Utente eliminato');
          } catch (err) { toast(err.message, { error: true, ms: 7000 }); }
        } }, 'Elimina'),
      ));
    }
  };

  const form = el('form', { class: 'card-form' },
    el('h3', { text: 'Aggiungi una persona' }),
    el('div', { class: 'field' }, el('span', { class: 'label', text: 'Nome utente' }), el('input', { type: 'text', name: 'username', required: true, autocomplete: 'off', placeholder: 'es. mario.rossi' })),
    el('div', { class: 'field' }, el('span', { class: 'label', text: 'Password (almeno 8 caratteri)' }), el('input', { type: 'text', name: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
    el('p', { class: 'help', text: 'Comunica nome utente e password alla persona: potrà entrare da questo stesso indirizzo.' }),
    el('div', {}, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Aggiungi utente')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const data = await api('POST', '/api/users', { username: form.username.value.trim(), password: form.password.value });
      draw(data.utenti);
      form.reset();
      toast('Utente aggiunto');
    } catch (err) {
      toast(err.message, { error: true, ms: 7000 });
    } finally {
      btn.disabled = false;
    }
  });
  root.append(form);

  try {
    draw((await api('GET', '/api/users')).utenti);
  } catch (err) {
    box.innerHTML = '';
    box.append(el('p', { class: 'loading', text: err.message }));
  }
}

async function passwordDialog(title) {
  const p1 = el('input', { type: 'password', autocomplete: 'new-password', style: { width: '100%', padding: '10px', font: 'inherit', border: '1px solid #e2e3e7', borderRadius: '8px' } });
  const p2 = p1.cloneNode();
  const err = el('p', { style: { color: '#c8102e', margin: 0, minHeight: '1.2em', fontSize: '14px' } });
  const body = el('div', { style: { display: 'grid', gap: '10px' } },
    el('label', { style: { display: 'grid', gap: '6px' } }, 'Nuova password (almeno 8 caratteri)', p1),
    el('label', { style: { display: 'grid', gap: '6px' } }, 'Ripeti la password', p2), err);
  setTimeout(() => p1.focus(), 50);
  while (true) {
    const r = await openDialog({ title, body, actions: [{ label: 'Annulla', value: null, class: 'btn-ghost' }, { label: 'Salva', value: 'ok', class: 'btn-primary' }] });
    if (r !== 'ok') return null;
    if (p1.value.length < 8) err.textContent = 'La password deve avere almeno 8 caratteri';
    else if (p1.value !== p2.value) err.textContent = 'Le due password non coincidono';
    else return p1.value;
  }
}

// ---------------------------------------------------------------- Avvio

(async () => {
  try {
    const me = await fetch('/api/me', { credentials: 'same-origin' });
    if (me.ok) {
      state.user = (await me.json()).utente;
      await start();
    } else {
      const data = await me.json().catch(() => ({}));
      showLogin(me.status === 401 ? '' : (data.errore || 'Il pannello non è raggiungibile'));
    }
  } catch {
    showLogin('Il pannello non è raggiungibile');
  }
})();


// ---------------------------------------------------------------- Shop: prodotti

function products() {
  return state.draft.shop.prodotti;
}

function uniqueProductId(base, except) {
  let id = slugify(base);
  if (id === 'carrello') id = 'carrello-1';
  const start = id;
  let n = 2;
  while (products().some((p) => p.id === id && p !== except)) id = `${start}-${n++}`;
  return id;
}

function renderProductList(root) {
  setTitle('Shop · Prodotti');
  root.append(
    el('p', { class: 'intro', text: 'Gli articoli in vendita nello shop. Clicca un prodotto per modificarlo; usa le frecce per cambiare l\'ordine in cui compaiono.' }),
    el('div', { class: 'ev-toolbar' }, el('button', { type: 'button', class: 'btn btn-primary', onclick: addProduct }, '+ Nuovo prodotto')),
  );
  const list = products();
  if (!list.length) { root.append(el('p', { class: 'help', text: 'Nessun prodotto.' })); return; }
  root.append(el('div', { class: 'ev-grid' }, list.map((p, i) => el('div', {
    class: 'ev-card' + (p.visibile === false ? ' hidden-ev' : ''),
    onclick: () => showSection('prodotti', { productId: p.id }),
  },
    el('div', { class: 'ev-poster', style: (p.immagini || [])[0] ? { backgroundImage: `url("${resolveAsset(p.immagini[0])}")`, aspectRatio: '1 / 1' } : { aspectRatio: '1 / 1' } }, (p.immagini || [])[0] ? '' : 'Senza foto'),
    el('div', { class: 'ev-info' },
      el('div', { class: 'ev-title', text: p.nome || '(senza nome)' }),
      el('div', { class: 'ev-date', text: p.prezzo !== '' && p.prezzo != null ? formatEuro(p.prezzo) : 'Prezzo da inserire' }),
      el('div', { class: 'badges' },
        p.visibile === false ? el('span', { class: 'badge off', text: 'Nascosto' }) : null,
        p.disponibile === false ? el('span', { class: 'badge off', text: 'Non disponibile' }) : null,
        p.scorte !== '' && p.scorte != null ? el('span', { class: 'badge', text: `${p.scorte} pz` }) : null,
        state.newProducts?.has(p.id) ? el('span', { class: 'badge new', text: 'Da pubblicare' }) : null)),
    el('div', { class: 'ev-move' },
      el('button', { type: 'button', title: 'Sposta prima', disabled: i === 0, onclick: (e) => { e.stopPropagation(); [list[i - 1], list[i]] = [list[i], list[i - 1]]; changed(); showSection('prodotti'); } }, '◀'),
      el('button', { type: 'button', title: 'Sposta dopo', disabled: i === list.length - 1, onclick: (e) => { e.stopPropagation(); [list[i + 1], list[i]] = [list[i], list[i + 1]]; changed(); showSection('prodotti'); } }, '▶')),
  ))));
}

function addProduct() {
  state.newProducts = state.newProducts || new Set();
  const p = {
    id: uniqueProductId('nuovo-prodotto'),
    nome: 'Nuovo prodotto', categoria: 'vinile', prezzo: '', sottotitolo: '', immagini: [],
    descrizione: '<p>Descrizione del prodotto.</p>', nome_variante: '', varianti: '', scorte: '', disponibile: true, visibile: true,
  };
  products().unshift(p);
  state.newProducts.add(p.id);
  changed();
  showSection('prodotti', { productId: p.id });
}

function renderProductEditor(root, id) {
  const p = products().find((x) => x.id === id);
  if (!p) return renderProductList(root);
  state.newProducts = state.newProducts || new Set();
  setTitle(p.nome || 'Prodotto');
  const url = el('p', { class: 'ev-url' });
  const drawUrl = () => { url.textContent = `Indirizzo della pagina: ${location.origin}/shop/${p.id}/` + (state.newProducts.has(p.id) ? ' (si crea dal nome)' : ''); };
  drawUrl();
  root.append(
    el('button', { type: 'button', class: 'btn btn-sm btn-ghost back', onclick: () => showSection('prodotti') }, '← Tutti i prodotti'),
    url,
    el('div', { class: 'group' }, el('div', { class: 'group-body', style: { paddingTop: '16px' } },
      PRODUCT_FIELDS.map((f) => field(f, p[f.k], (v) => {
        p[f.k] = v;
        if (f.k === 'nome') {
          setTitle(v || 'Prodotto');
          if (state.newProducts.has(p.id)) {
            state.newProducts.delete(p.id);
            p.id = uniqueProductId(v || 'prodotto', p);
            state.newProducts.add(p.id);
            state.productId = p.id;
            drawUrl();
          }
        }
        changed();
      })))),
    el('div', { class: 'danger-zone' },
      el('button', { type: 'button', class: 'btn btn-danger', onclick: async () => {
        if (!(await confirmDialog('Eliminare il prodotto?', `"${p.nome}" verrà tolto dallo shop alla prossima pubblicazione. Se vuoi solo nasconderlo, togli la spunta "Mostra nello shop".`, 'Elimina', true))) return;
        products().splice(products().indexOf(p), 1);
        changed();
        showSection('prodotti');
      } }, 'Elimina prodotto')),
  );
}

// ---------------------------------------------------------------- Shop: ordini

const STATO_LABEL = Object.fromEntries(STATI_ORDINE);

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

async function refreshOrderBadge() {
  try {
    const data = await api('GET', '/api/ordini');
    state.nuoviOrdini = data.ordini.filter((o) => o.stato === 'nuovo').length;
    renderNav();
    return data.ordini;
  } catch { return null; }
}

async function renderOrders(root) {
  setTitle('Ordini');
  root.append(el('p', { class: 'intro', text: 'Gli ordini arrivati dallo shop, dal più recente. Quando ricevi il bonifico segna l\'ordine come "Pagato", poi come "Spedito". Le modifiche agli ordini si salvano subito.' }));
  const box = el('div', {}, el('p', { class: 'loading', text: 'Caricamento degli ordini…' }));
  root.append(box);
  const ordini = await refreshOrderBadge();
  box.innerHTML = '';
  if (!ordini) { box.append(el('p', { class: 'loading', text: 'Non è stato possibile caricare gli ordini.' })); return; }
  if (!ordini.length) { box.append(el('p', { class: 'loading', text: 'Ancora nessun ordine.' })); return; }
  const filtro = el('select', {}, el('option', { value: '' }, 'Tutti gli stati'), STATI_ORDINE.map(([v, t]) => el('option', { value: v }, t)));
  const list = el('div', { class: 'orders' });
  const draw = () => {
    list.innerHTML = '';
    ordini.filter((o) => !filtro.value || o.stato === filtro.value).forEach((o) => list.append(orderCard(o)));
  };
  filtro.addEventListener('change', draw);
  box.append(el('div', { class: 'field', style: { maxWidth: '260px', marginBottom: '12px' } }, filtro), list);
  draw();
}

function orderCard(o) {
  if (o.illeggibile) return el('div', { class: 'order' }, el('p', { text: `${o.numero}: ordine non leggibile (la chiave SESSION_SECRET è cambiata?)` }));
  const cliente = `${o.cliente.nome} ${o.cliente.cognome}`;
  const stato = el('select', {}, STATI_ORDINE.map(([v, t]) => el('option', { value: v, selected: v === o.stato }, t)));
  const nota = el('textarea', { rows: 2, placeholder: 'Note interne (non visibili al cliente)' });
  nota.value = o.nota_interna || '';
  const save = el('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: async () => {
    save.disabled = true;
    try {
      const res = await api('PATCH', '/api/ordini', { numero: o.numero, stato: stato.value, nota_interna: nota.value });
      Object.assign(o, res.ordine);
      badge.textContent = STATO_LABEL[o.stato];
      badge.className = 'badge stato-' + o.stato;
      toast('Ordine aggiornato');
      refreshOrderBadge();
    } catch (err) { toast(err.message, { error: true, ms: 7000 }); }
    save.disabled = false;
  } }, 'Salva');
  const badge = el('span', { class: 'badge stato-' + o.stato, text: STATO_LABEL[o.stato] });
  const tel = String(o.cliente.telefono || '').replace(/[^0-9+]/g, '');
  const waNum = tel.startsWith('+') ? tel.slice(1) : (tel.startsWith('00') ? tel.slice(2) : '39' + tel);
  const msgPagato = `Ciao ${o.cliente.nome}, abbiamo ricevuto il bonifico per l'ordine ${o.numero}. Grazie! ${o.consegna === 'spedizione' ? 'Ti avviseremo appena spedito.' : 'Ti aspettiamo a Palazzo Guarnieri per il ritiro.'}`;
  return el('details', { class: 'order item' },
    el('summary', {},
      el('span', { class: 't' }, `${o.numero} · ${cliente}`),
      el('span', { class: 'order-total', text: formatEuro(o.totale) }),
      badge),
    el('div', { class: 'item-body' },
      el('p', { class: 'help', text: `Ricevuto il ${fmtDate(o.data)}${o.aggiornato ? ` · aggiornato da ${o.aggiornato_da}` : ''}` }),
      el('table', { class: 'order-lines' },
        o.righe.map((r) => el('tr', {}, el('td', {}, `${r.quantita} × ${r.nome}${r.variante ? ` (${r.variante})` : ''}`), el('td', { text: formatEuro(r.importo) }))),
        el('tr', {}, el('td', { text: o.consegna === 'spedizione' ? 'Spedizione' : 'Ritiro a Palazzo Guarnieri' }), el('td', { text: o.spedizione ? formatEuro(o.spedizione) : 'Gratis' })),
        el('tr', { class: 'tot' }, el('td', { text: 'Totale' }), el('td', { text: formatEuro(o.totale) }))),
      el('div', { class: 'order-cols' },
        el('div', {}, el('strong', { text: 'Cliente' }), el('p', {}, cliente, el('br'), el('a', { href: `mailto:${o.cliente.email}` }, o.cliente.email), el('br'), el('a', { href: `tel:${tel}` }, o.cliente.telefono))),
        o.indirizzo ? el('div', {}, el('strong', { text: 'Spedire a' }), el('p', {}, cliente, el('br'), o.indirizzo.via, el('br'), `${o.indirizzo.cap} ${o.indirizzo.citta} (${o.indirizzo.provincia})`)) : null),
      o.note ? el('p', {}, el('strong', { text: 'Note del cliente: ' }), o.note) : null,
      el('div', { class: 'field' }, el('span', { class: 'label', text: 'Stato' }), stato),
      el('div', { class: 'field' }, nota),
      el('div', { class: 'media-actions' },
        save,
        el('a', { class: 'btn btn-sm', href: `https://wa.me/${waNum}?text=${encodeURIComponent(msgPagato)}`, target: '_blank', rel: 'noopener' }, 'WhatsApp al cliente'),
        el('a', { class: 'btn btn-sm btn-ghost', href: `mailto:${o.cliente.email}?subject=${encodeURIComponent('Il tuo ordine ' + o.numero)}&body=${encodeURIComponent(msgPagato)}` }, 'Email al cliente')),
    ));
}
