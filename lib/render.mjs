// Genera l'HTML delle pagine del sito a partire dai contenuti (content/*.json).
// Usato da scripts/build.mjs per pubblicare il sito e dal pannello /admin per l'anteprima.

import { sanitizeRich, escapeHtml as esc, safeUrl } from './sanitize.mjs';

// Pagine fisse del sito. Gli eventi aggiungono una pagina ciascuno.
export const PAGES = [
  { id: 'home', path: 'index.html', nome: 'Home' },
  { id: 'jazzcafe', path: 'unisono-jazz-cafe-restaurant/index.html', nome: 'Jazz Cafè' },
  { id: 'scuola', path: 'scuola-di-musica/index.html', nome: 'Scuola & Corsi' },
  { id: 'award', path: 'music-ambassador-award/index.html', nome: 'Music Ambassador Award' },
  { id: 'studios', path: 'recording/index.html', nome: 'Unisono Studios' },
  { id: 'archivio', path: 'eventi-passati/index.html', nome: 'Eventi passati' },
  { id: 'privacy', path: 'privacy-policy/index.html', nome: 'Privacy Policy' },
  { id: 'cookie', path: 'cookie-policy/index.html', nome: 'Cookie Policy' },
];

// Pagine a cui possono puntare pulsanti e schede
export const LINK_TARGETS = {
  home: 'index.html',
  jazzcafe: 'unisono-jazz-cafe-restaurant/index.html',
  scuola: 'scuola-di-musica/index.html',
  award: 'music-ambassador-award/index.html',
  studios: 'recording/index.html',
  masterclass: 'index.html#masterclass',
  eventi: 'index.html#events',
  archivio: 'eventi-passati/index.html',
  dove: 'index.html#dove-siamo',
  privacy: 'privacy-policy/index.html',
  cookie: 'cookie-policy/index.html',
};

export function eventPath(ev) {
  return `${ev.slug}/index.html`;
}

const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1C8.7 6.4 8.5 5.2 8.5 4c0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
const ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>';
const ICON_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>';
const ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>';

// Larghezze delle immagini ottimizzate da Vercel (devono coincidere con vercel.json → images.sizes)
export const IMAGE_SIZES = [384, 640, 828, 1200, 1920];
const RASTER = /\.(jpe?g|png|webp|gif)$/i;

// Contesto di rendering: gestisce i percorsi relativi e l'ottimizzazione delle immagini
function makeCtx(depth, opts = {}) {
  const p = opts.prefix ?? '../'.repeat(depth);
  const asset = (path) => {
    if (!path) return '';
    if (opts.resolve) return opts.resolve(path);
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return p + path;
  };
  // Con l'ottimizzazione attiva, Vercel converte in WebP/AVIF e ridimensiona al volo
  const optimized = (path, w) => {
    if (!opts.optimizeImages || !path || !RASTER.test(path) || /^(https?:|data:|blob:)/.test(path)) return null;
    return `/_vercel/image?url=${encodeURIComponent('/' + path)}&w=${w}&q=75`;
  };
  const link = (target) => {
    if (!target) return '#';
    if (LINK_TARGETS[target]) return p + LINK_TARGETS[target];
    return asset(safeUrl(target)) || '#';
  };
  const absolute = (path) => {
    const base = String(opts.siteUrl || '').replace(/\/+$/, '');
    if (!path) return base + '/';
    if (/^https?:/.test(path)) return path;
    return `${base}/${String(path).replace(/index\.html$/, '')}`;
  };
  return { p, asset, optimized, link, absolute, today: opts.today || todayInItaly(), preview: Boolean(opts.resolve) };
}

// Data di oggi in Italia, nel formato AAAA-MM-GG
export function todayInItaly(date = new Date()) {
  try {
    return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// ------------------------------------------------------------- Date

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

// "venerdì 23 ottobre 2026" oppure "23 – 24 ottobre 2026" oppure "30 agosto – 3 settembre 2026"
export function formatDateRange(start, end, { weekday = true } = {}) {
  if (!DATE_RE.test(start || '')) return '';
  const a = parts(start);
  if (!DATE_RE.test(end || '') || end === start) {
    return `${weekday ? GIORNI[a.wd] + ' ' : ''}${a.d} ${MESI[a.m - 1]} ${a.y}`;
  }
  const b = parts(end);
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MESI[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MESI[a.m - 1]} – ${b.d} ${MESI[b.m - 1]} ${b.y}`;
  return `${a.d} ${MESI[a.m - 1]} ${a.y} – ${b.d} ${MESI[b.m - 1]} ${b.y}`;
}

export function eventEnd(ev) {
  if (DATE_RE.test(ev.data_fine || '')) return ev.data_fine;
  if (DATE_RE.test(ev.data || '')) return ev.data;
  return '';
}

export function isPast(ev, today) {
  const end = eventEnd(ev);
  return Boolean(end) && end < today;
}

// Eventi: prima quelli con data (dal più vicino), poi gli altri nell'ordine del pannello
export function sortEvents(list) {
  return list
    .map((ev, i) => ({ ev, i }))
    .sort((x, y) => {
      const a = x.ev.data || '';
      const b = y.ev.data || '';
      if (a && b && a !== b) return a < b ? -1 : 1;
      if (a && !b) return -1;
      if (!a && b) return 1;
      return x.i - y.i;
    })
    .map((x) => x.ev);
}

// ------------------------------------------------------------- Utility

const rich = (html) => sanitizeRich(html);
const lines = (text) => esc(text).replace(/\r?\n/g, '<br>');
const digits = (phone) => String(phone || '').replace(/[^0-9]/g, '');
const tel = (phone) => '+39' + digits(phone);
const plainText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const truncate = (text, n) => (text.length > n ? text.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : text);

export function whatsappUrl(site, message = '') {
  const n = digits(site.contatti.whatsapp || site.contatti.telefono);
  return `https://wa.me/39${n}${message ? '?text=' + encodeURIComponent(message) : ''}`;
}

function phoneLine(site) {
  return `(+39) <em><strong>${esc(site.contatti.telefono)}</strong></em>`;
}

function isExternal(url) {
  return /^https?:/i.test(url || '');
}

function externalAttrs(url) {
  return isExternal(url) || /\.pdf$/i.test(url || '') ? ' target="_blank" rel="noopener"' : '';
}

// sizes: quanto è larga l'immagine sullo schermo, per scegliere il file giusto
function img(c, path, alt = '', cls = '', lazy = true, sizes = '100vw') {
  if (!path) return '';
  const src = c.asset(path);
  const opt = c.optimized(path, 1200);
  const attrs = `alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ''}`;
  if (!opt) return `<img src="${esc(src)}" ${attrs}>`;
  const srcset = IMAGE_SIZES.map((w) => `${c.optimized(path, w)} ${w}w`).join(', ');
  const fallback = `this.onerror=null;this.removeAttribute('srcset');this.src='${esc(src).replace(/'/g, '%27')}'`;
  return `<img src="${esc(opt)}" srcset="${esc(srcset)}" sizes="${esc(sizes)}" ${attrs} onerror="${fallback}">`;
}

function bg(c, path) {
  if (!path) return '';
  const url = c.optimized(path, 1920) || c.asset(path);
  return `background-image:url('${esc(url).replace(/'/g, '%27')}')`;
}

// ------------------------------------------------------------- Struttura comune

function header(c, site, active, transparent) {
  const cls = (key) => (key === active ? ' class="active"' : '');
  const g = site.generale;
  return `<header class="site-header${transparent ? ' transparent' : ''}">
  <div class="header-inner">
    <a class="logo" href="${c.p}index.html" aria-label="UNISONO Factory - Home">
      <img src="${esc(c.asset(g.logo_header))}" alt="UNISONO Factory" width="122" height="52">
    </a>
    <button class="menu-toggle" type="button" aria-label="Apri il menu" aria-expanded="false"><span></span></button>
    <nav class="main-nav" aria-label="Menu principale">
      <ul>
        <li><a href="${c.p}index.html#events"${cls('eventi')}>Eventi</a></li>
        <li><a href="${c.p}unisono-jazz-cafe-restaurant/index.html"${cls('jazz')}>Jazz Cafè</a></li>
        <li class="has-sub">
          <a href="${c.p}scuola-di-musica/index.html"${cls('centro')}>Centro di Musica</a>
          <ul class="sub-menu">
            <li><a href="${c.p}scuola-di-musica/index.html">Scuola &amp; Corsi</a></li>
            <li><a href="${c.p}index.html#masterclass">Masterclass</a></li>
            <li><a href="${c.p}music-ambassador-award/index.html">Music Ambassador Award</a></li>
          </ul>
        </li>
        <li><a href="${c.p}recording/index.html"${cls('studios')}>Studios</a></li>
        <li><a href="${c.p}index.html#dove-siamo">Dove siamo</a></li>
      </ul>
    </nav>
    <a class="nav-cta" href="${esc(whatsappUrl(site, g.messaggio_whatsapp || ''))}" target="_blank" rel="noopener">${ICON_WA}<span>${esc(g.pulsante_prenota || 'Prenota')}</span></a>
  </div>
</header>`;
}

function mobileBar(site) {
  const g = site.generale;
  return `<div class="mobile-bar" role="navigation" aria-label="Contatti rapidi">
  <a href="tel:${tel(site.contatti.telefono)}">${ICON_PHONE}<span>Chiama</span></a>
  <a class="wa" href="${esc(whatsappUrl(site, g.messaggio_whatsapp || ''))}" target="_blank" rel="noopener">${ICON_WA}<span>${esc(g.pulsante_prenota || 'Prenota')} su WhatsApp</span></a>
</div>`;
}

function footer(c, site) {
  const g = site.generale;
  const ct = site.contatti;
  const az = site.azienda;
  const privacy = g.privacy_url || 'privacy';
  const cookie = g.cookie_url || 'cookie';
  return `<footer class="site-footer bg-photo" style="${bg(c, g.sfondo_footer)}">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h4>${esc(az.nome)}</h4>
        <p>${lines(az.indirizzo)}</p>
        <p>${lines(az.dati_fiscali)}</p>
      </div>
      <div>
        <h4>Contatti</h4>
        <p><a class="ico" href="tel:${tel(ct.telefono)}">${ICON_PHONE}<span>${phoneLine(site)}</span></a></p>
        <p><a class="ico" href="${esc(whatsappUrl(site))}" target="_blank" rel="noopener">${ICON_WA}<span>WhatsApp</span></a></p>
        <p><a class="ico" href="mailto:${esc(ct.email)}">${ICON_MAIL}<span>${esc(ct.email)}</span></a></p>
      </div>
      <div>
        <h4>Privacy</h4>
        <p><a href="${esc(c.link(privacy))}">Privacy Policy</a><br><a href="${esc(c.link(cookie))}">Cookie Policy</a></p>
        <p>Per cancellare tutti i tuoi dati dai nostri database:</p>
        <p><a class="ico" href="mailto:${esc(ct.email_privacy)}">${ICON_MAIL}<span>${esc(ct.email_privacy)}</span></a></p>
      </div>
      <div class="footer-logo">
        <img src="${esc(c.asset(g.logo_footer))}" alt="UNISONO Factory" width="120" height="60" loading="lazy">
        <div class="social">
          ${ct.facebook ? `<a href="${esc(safeUrl(ct.facebook))}" target="_blank" rel="noopener" aria-label="Facebook">${ICON_FB}</a>` : ''}
          ${ct.instagram ? `<a href="${esc(safeUrl(ct.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}</a>` : ''}
        </div>
      </div>
    </div>
  </div>
</footer>
${mobileBar(site)}
<button class="to-top" type="button" aria-label="Torna su">&#8963;</button>`;
}

// Attiva l'anteprima del nuovo stile grafico con ?stile=nuovo (e la toglie con ?stile=attuale)
const THEME_SCRIPT = `<script>try{var s=new URLSearchParams(location.search).get('stile');if(s==='nuovo')localStorage.setItem('unisono-stile','nuovo');if(s==='attuale')localStorage.removeItem('unisono-stile');if(localStorage.getItem('unisono-stile')==='nuovo')document.documentElement.classList.add('tema-nuovo');}catch(e){}</script>`;

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function organizationLd(c, site) {
  const ct = site.contatti;
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: 'UNISONO Factory – Palazzo Guarnieri',
    url: c.absolute(''),
    telephone: tel(ct.telefono),
    email: ct.email,
    image: c.absolute(site.home.hero.sfondo),
    logo: c.absolute(site.generale.logo_footer),
    address: { '@type': 'PostalAddress', addressLocality: 'Feltre', postalCode: '32032', addressRegion: 'BL', addressCountry: 'IT' },
    sameAs: [ct.facebook, ct.instagram].filter(Boolean),
  };
}

function layout(c, site, { title, body, active = '', transparent = false, home = false, description = '', image = '', path = '', ld = [] }) {
  const g = site.generale;
  const desc = truncate(plainText(description) || g.descrizione, 160);
  const ogImage = c.absolute(image || site.home.hero.sfondo);
  const url = c.absolute(path);
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="UNISONO Factory">
  <meta property="og:locale" content="it_IT">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#141618">
  <link rel="icon" type="image/png" href="${esc(c.asset(g.logo_footer))}">
  <link rel="preload" href="${c.p}assets/fonts/abril-fatface-latin.woff2" as="font" type="font/woff2" crossorigin>
  ${THEME_SCRIPT}
  <link rel="stylesheet" href="${c.p}css/style.css">
  <link rel="stylesheet" href="${c.p}css/tema-nuovo.css">
  ${ld.map(jsonLd).join('\n  ')}
</head>
<body${home ? ' class="home"' : ''}>
${header(c, site, active, transparent)}
<main>
${body}
</main>
${footer(c, site)}
<script src="${c.p}js/main.js"></script>
</body>
</html>
`;
}

function eventMeta(ev) {
  return [formatDateRange(ev.data, ev.data_fine, { weekday: !ev.data_fine }), ev.luogo].filter(Boolean).join(' · ');
}

// hidden: scheda presente ma nascosta (la mostra lo script quando serve)
// concluso: evento già svolto, mostrato con l'etichetta "Concluso"
function card(c, ev, label, { hidden = false, concluso = false, labelPast = 'Vedi' } = {}) {
  const href = c.p + eventPath(ev);
  const meta = eventMeta(ev);
  const end = eventEnd(ev);
  return `<article class="card${concluso ? ' is-past' : ''}"${end ? ` data-fine="${end}"` : ''}${hidden ? ' hidden' : ''}>
          <a class="card-media" href="${href}">${img(c, ev.immagine_home || ev.locandina, ev.titolo, '', true, '(max-width: 719px) 92vw, (max-width: 959px) 46vw, 360px')}<span class="badge-past">Concluso</span></a>
          ${meta ? `<p class="card-date">${ICON_CAL}<span>${esc(meta)}</span></p>` : ''}
          <h3><a href="${href}">${esc(ev.titolo)}</a></h3>
          <a class="btn" href="${href}" data-label="${esc(label)}" data-label-past="${esc(labelPast)}">${esc(concluso ? labelPast : label)}</a>
        </article>`;
}

// Copertina di una novità (dischi, produzioni): vinile che esce dalla copertina
function release(c, ev, label) {
  const href = c.p + eventPath(ev);
  return `<article class="release reveal">
        <a class="release-cover" href="${href}" aria-label="${esc(ev.titolo)}">
          <span class="vinyl" aria-hidden="true"></span>
          ${img(c, ev.immagine_home || ev.locandina, ev.titolo, '', true, '(max-width: 719px) 80vw, 340px')}
        </a>
        <div class="release-info">
          <h3><a href="${href}">${esc(ev.titolo)}</a></h3>
          ${ev.sottotitolo ? `<p>${esc(ev.sottotitolo)}</p>` : ''}
          <a class="btn btn-outline" href="${href}">${esc(label)}</a>
        </div>
      </article>`;
}

// Locandine della Home: tutti gli eventi in programma; se sono meno di 3,
// si completano con gli ultimi già svolti (con l'etichetta "Concluso")
export const MIN_LOCANDINE = 3;
export function homeEvents(list, today) {
  const sorted = sortEvents(list);
  const upcoming = sorted.filter((e) => !isPast(e, today));
  const past = sorted.filter((e) => isPast(e, today)).reverse();
  const fill = Math.max(0, MIN_LOCANDINE - upcoming.length);
  return [
    ...upcoming.map((ev) => ({ ev, concluso: false, hidden: false })),
    // Anche i successivi ultimi 3 conclusi restano nella pagina, nascosti: servono allo script
    // quando un evento in programma si conclude prima della prossima pubblicazione
    ...past.slice(0, MIN_LOCANDINE).map((ev, i) => ({ ev, concluso: true, hidden: i >= fill })),
  ];
}

function contactBlock(c, site) {
  const m = site.modulo;
  const privacy = site.generale.privacy_url || 'privacy';
  const cookie = site.generale.cookie_url || 'cookie';
  return `<section class="scrivici">
  <div class="container"><h2>${lines(m.titolo)}</h2></div>
</section>
<section class="contatto bg-photo" style="${bg(c, m.sfondo)}">
  <div class="container">
    <h3>${esc(m.sottotitolo)}</h3>
    ${rich(m.testo)}
    <form class="contact-form" data-to="${esc(m.email_destinatario || site.contatti.email)}" data-wa="${esc(whatsappUrl(site))}">
      <div class="form-field"><label for="nome">Nome e cognome</label><input id="nome" name="nome" type="text" required autocomplete="name"></div>
      <div class="form-field"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="form-field"><label for="messaggio">Messaggio</label><textarea id="messaggio" name="messaggio" required></textarea></div>
      <p class="form-privacy"><label><input type="checkbox" required> Ho letto la <a href="${esc(c.link(privacy))}">Privacy Policy</a> e la <a href="${esc(c.link(cookie))}">Cookie Policy</a>. Per cancellare i dati inviati posso scrivere a <a href="mailto:${esc(site.contatti.email_privacy)}">${esc(site.contatti.email_privacy)}</a>.</label></p>
      <div class="form-actions">
        <button class="btn btn-lg btn-wa" type="submit" value="whatsapp">${ICON_WA}<span>Invia su WhatsApp</span></button>
        <button class="btn btn-lg" type="submit" value="email">Invia per email</button>
      </div>
    </form>
  </div>
</section>`;
}

function related(c, data) {
  const tiles = (data.schede || []).map((t) =>
    `<a class="tile${t.immagine ? '' : ' plain'}" href="${esc(c.link(t.link))}"${t.immagine ? ` style="${bg(c, t.immagine)}"` : ''}><h3>${esc(t.titolo)}</h3></a>`).join('');
  return `<section class="band small bg-navy"><div class="container"><h2>${esc(data.titolo)}</h2></div></section>
<section class="related bg-photo" style="${bg(c, data.sfondo)}">
  <div class="tiles">${tiles}</div>
</section>`;
}

function slideshow(c, images, alt, sizes = '(max-width: 719px) 100vw, 50vw') {
  return `<div class="slideshow">${(images || []).map((src) => img(c, src, alt, '', true, sizes)).join('')}</div>`;
}

// Intestazione di sezione nello stile della vetrina Novità: scritta piccola, titolo, testo
function head(eyebrow, title, intro = '', { tag = 'h2', center = true, titleHtml = false } = {}) {
  if (!eyebrow && !title && !intro) return '';
  return `<div class="sec-head${center ? ' center' : ''} reveal">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      ${title ? `<${tag}>${titleHtml ? title : lines(title)}</${tag}>` : ''}
      ${intro ? `<div class="sec-intro">${rich(intro)}</div>` : ''}
    </div>`;
}

function doveSiamo(c, site) {
  const d = site.home.dove;
  const ct = site.contatti;
  if (!d || d.visibile === false) return '';
  return `<section id="dove-siamo" class="dk dk-glow-br">
  <div class="container split">
    <div>
      ${head(d.etichetta, d.titolo, d.testo, { center: false })}
      <ul class="info-list reveal">
        <li>${ICON_PIN}<span>${lines(d.indirizzo)}</span></li>
        ${ct.orari ? `<li>${ICON_CLOCK}<span>${lines(ct.orari)}</span></li>` : ''}
        <li>${ICON_PHONE}<a href="tel:${tel(ct.telefono)}">(+39) ${esc(ct.telefono)}</a></li>
        <li>${ICON_MAIL}<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a></li>
      </ul>
      <div class="btn-row reveal">
        <a class="btn btn-lg btn-wa" href="${esc(whatsappUrl(site, site.generale.messaggio_whatsapp || ''))}" target="_blank" rel="noopener">${ICON_WA}<span>Scrivici su WhatsApp</span></a>
        ${d.mappa ? `<a class="btn btn-lg btn-outline" href="${esc(safeUrl(d.mappa))}" target="_blank" rel="noopener">${ICON_PIN}<span>${esc(d.pulsante_mappa || 'Apri in Google Maps')}</span></a>` : ''}
      </div>
    </div>
    <div class="framed reveal">${img(c, d.immagine, 'Palazzo Guarnieri, Feltre', '', true, '(max-width: 719px) 92vw, 540px')}</div>
  </div>
</section>`;
}

// ------------------------------------------------------------- Home

function renderHome(c, site, eventi) {
  const h = site.home;
  const visibili = (eventi.eventi || []).filter((e) => e.visibile !== false);
  const locandine = homeEvents(visibili.filter((e) => e.tipo !== 'novita'), c.today);
  const ev = locandine.filter((x) => !x.concluso).map((x) => x.ev);
  const nov = visibili.filter((e) => e.tipo === 'novita');
  const hasPast = visibili.some((e) => e.tipo !== 'novita' && isPast(e, c.today));

  // Il carosello del Centro di Musica ripete le schede per riempire lo spazio
  const tiles = h.centro.schede || [];
  const repeated = [];
  if (tiles.length) while (repeated.length < 6) repeated.push(...tiles);
  const tilesHtml = repeated.slice(0, Math.max(6, tiles.length)).map((t) =>
    `<a class="tile${t.immagine ? '' : ' plain'}" href="${esc(c.link(t.link))}"${t.immagine ? ` style="${bg(c, t.immagine)}"` : ''}><h3>${esc(t.titolo)}</h3></a>`).join('\n      ');

  // Le masterclass concluse spariscono da sole; se non ne resta nessuna la sezione non compare
  const corsi = (h.masterclass.corsi || []).filter((m) => !(m.data_fine && m.data_fine < c.today));
  const masterclass = corsi.map((m) => `
      <article class="mc-card reveal"${m.data_fine ? ` data-fine="${esc(m.data_fine)}"` : ''}>
        <div class="framed">${img(c, m.immagine, '', '', true, '(max-width: 719px) 92vw, 540px')}</div>
        <div class="mc-text">${rich(m.testo)}</div>
        ${m.pdf ? `<a class="btn btn-outline" href="${esc(c.asset(m.pdf))}" target="_blank" rel="noopener">${esc(m.pulsante || 'Scarica il programma')}</a>` : ''}
      </article>`).join('');

  const hero = h.hero;
  const body = `
<section class="hero">
  <div class="hero-bg" style="${bg(c, hero.sfondo)}"></div>
  <div class="hero-content">
    <h1 class="sr-only">UNISONO Factory – Palazzo Guarnieri, Feltre</h1>
    ${img(c, hero.logo, 'UNISONO', 'hero-logo', false, '(max-width: 719px) 80vw, 640px')}
    ${hero.frase ? `<p class="hero-tagline">${lines(hero.frase)}</p>` : ''}
    <div class="hero-actions">
      ${hero.pulsante_eventi ? `<a class="btn btn-xl btn-rosso" href="#events">${esc(hero.pulsante_eventi)}</a>` : ''}
      ${hero.pulsante_prenota ? `<a class="btn btn-xl btn-outline" href="${esc(whatsappUrl(site, site.generale.messaggio_whatsapp || ''))}" target="_blank" rel="noopener">${esc(hero.pulsante_prenota)}</a>` : ''}
    </div>
  </div>
  <a class="hero-scroll" href="#events" aria-label="Scorri ai prossimi eventi"></a>
</section>

<section id="events" class="dk dk-glow-tl">
  <div class="container">
    ${head(h.eventi.etichetta, h.eventi.titolo, h.eventi.testo)}
    <div class="cards">
        ${locandine.map((x) => card(c, x.ev, h.eventi.pulsante || 'Scopri e prenota', { concluso: x.concluso, hidden: x.hidden })).join('\n        ')}
    </div>
    <p class="cards-empty"${locandine.some((x) => !x.hidden) ? ' hidden' : ''}>${esc(h.eventi.vuoto || 'Nuove date in arrivo.')}</p>
    <div class="sec-foot">
      <p>${esc(h.eventi.info)} <a href="tel:${tel(site.contatti.telefono)}"><strong>(+39) ${esc(site.contatti.telefono)}</strong></a></p>
      <a class="btn btn-wa" href="${esc(whatsappUrl(site, site.generale.messaggio_whatsapp || ''))}" target="_blank" rel="noopener">${ICON_WA}<span>Prenota su WhatsApp</span></a>
      ${hasPast ? `<a class="link-archive" href="${c.p}eventi-passati/index.html">Guarda gli eventi passati →</a>` : ''}
    </div>
  </div>
</section>

${nov.length ? `<section id="novita" class="novita-section">
  <div class="container">
    <div class="novita-head reveal">
      ${img(c, h.novita.logo, 'Unisono Records', 'novita-logo-img', true, '150px')}
      <div>
        ${h.novita.etichetta ? `<p class="eyebrow">${esc(h.novita.etichetta)}</p>` : ''}
        <h2>${esc(h.novita.titolo)}</h2>
        ${rich(h.novita.testo)}
      </div>
    </div>
    <div class="releases">
      ${nov.map((e) => release(c, e, h.novita.pulsante || 'Scopri di più')).join('\n      ')}
    </div>
    <div class="novita-foot">
      <p>${esc(h.novita.info)} <a href="tel:${tel(site.contatti.telefono)}"><strong>(+39) ${esc(site.contatti.telefono)}</strong></a></p>
      <a class="btn btn-wa" href="${esc(whatsappUrl(site, 'Ciao, vorrei acquistare '))}" target="_blank" rel="noopener">${ICON_WA}<span>Acquista su WhatsApp</span></a>
    </div>
  </div>
</section>` : ''}

${corsi.length ? `<section id="masterclass" class="dk dk-glow-tr">
  <div class="container">
    ${head(h.masterclass.etichetta, h.masterclass.titolo, h.masterclass.testo)}
    <div class="mc-grid">${masterclass}
    </div>
  </div>
</section>` : '<span id="masterclass"></span>'}

<section class="mondo dk-photo" style="${bg(c, h.mondo.sfondo)}">
  <div class="container center">
    ${img(c, h.mondo.logo, 'UNISONO Factory', 'mondo-logo reveal', true, '230px')}
    ${head(h.mondo.etichetta, h.mondo.titolo, h.mondo.testo)}
  </div>
</section>

<section class="jazz dk-photo dk-photo-red" style="${bg(c, h.jazz.sfondo)}">
  <div class="container split">
    <div class="reveal">
      ${img(c, h.jazz.logo, 'Unisono Jazz Cafè', 'side-logo', true, '160px')}
      ${head(h.jazz.etichetta, h.jazz.titolo, '', { center: false })}
      <a class="btn btn-xl btn-rosso" href="${c.p}unisono-jazz-cafe-restaurant/index.html">${esc(h.jazz.pulsante)}</a>
    </div>
    <div class="glass reveal">
      ${rich(h.jazz.testo)}
    </div>
  </div>
</section>

<section class="centro dk-photo" style="${bg(c, h.centro.sfondo)}">
  <div class="container center">
    ${img(c, h.centro.logo, 'Centro di Musica UNISONO', 'centro-logo reveal', true, '200px')}
    ${head(h.centro.etichetta, '', h.centro.testo)}
  </div>
  <div class="carousel">
    <button class="carousel-btn prev" type="button" aria-label="Precedente">&#8249;</button>
    <div class="carousel-track">
      ${tilesHtml}
    </div>
    <button class="carousel-btn next" type="button" aria-label="Successivo">&#8250;</button>
  </div>
  <div class="container">
    <p class="note">${esc(h.centro.nota)}</p>
  </div>
</section>

<section class="studios dk-photo" style="${bg(c, h.studios.sfondo)}">
  <div class="container split">
    <div class="reveal">
      ${head(h.studios.etichetta, h.studios.titolo, '', { center: false })}
      <a class="btn btn-xl btn-gold" href="${c.p}recording/index.html">${esc(h.studios.pulsante)}</a>
    </div>
    <div class="glass reveal">
      ${rich(h.studios.testo)}
    </div>
  </div>
</section>

<section class="family dk dk-glow-tl">
  <div class="container split">
    <div>
      ${head(h.family.etichetta, h.family.titolo, h.family.testo, { center: false })}
      <a class="btn btn-xl btn-gold reveal" href="${esc(c.asset(h.family.pdf))}" target="_blank" rel="noopener">${esc(h.family.pulsante)}</a>
    </div>
    <a class="framed reveal" href="${esc(c.asset(h.family.pdf))}" target="_blank" rel="noopener">${img(c, h.family.immagine, 'Unisono Family', '', true, '(max-width: 719px) 92vw, 540px')}</a>
  </div>
</section>

<section class="palazzo dk-photo" style="${bg(c, h.palazzo.sfondo)}">
  <div class="container">
    <div class="glass palazzo-glass reveal">
      ${head(h.palazzo.etichetta, `${esc(h.palazzo.titolo)} <span>${esc(h.palazzo.sottotitolo)}</span>`, '', { center: false, titleHtml: true })}
      ${rich(h.palazzo.testo)}
    </div>
  </div>
</section>

${h.gallery.visibile === false ? '' : `<section class="gallery dk-photo" style="${bg(c, h.gallery.sfondo)}">
  <div class="container split">
    <div class="collage reveal">
      ${(h.gallery.immagini || []).slice(0, 3).map((src) => img(c, src, '', '', true, '280px')).join('\n      ')}
    </div>
    <div>
      ${head(h.gallery.etichetta, h.gallery.titolo, h.gallery.testo, { center: false })}
      ${h.gallery.pulsante ? `<a class="btn btn-lg btn-outline" href="${esc(c.link(h.gallery.link))}"${h.gallery.link ? externalAttrs(h.gallery.link) : ' aria-disabled="true"'}>${esc(h.gallery.pulsante)}</a>` : ''}
    </div>
  </div>
</section>`}

${doveSiamo(c, site)}

<section class="sponsor dk">
  <div class="container">
    ${head(h.sponsor.etichetta, h.sponsor.titolo)}
    <div class="sponsor-box reveal">${img(c, h.sponsor.immagine, 'Main sponsor, partner e media partner', '', true, '(max-width: 1140px) 92vw, 1068px')}</div>
    ${h.sponsor.banner ? `<a class="poc reveal" href="${esc(safeUrl(h.sponsor.link) || '#')}" target="_blank" rel="noopener">${img(c, h.sponsor.banner, 'Progetto finanziato con il POC Regione del Veneto - Vai ai dettagli', '', true, '(max-width: 719px) 92vw, 680px')}</a>` : ''}
  </div>
</section>
`;
  return layout(c, site, {
    title: site.generale.titolo_home || 'UNISONO Factory',
    body, transparent: true, home: true, path: '',
    ld: [organizationLd(c, site), ...ev.filter((e) => e.data).map((e) => eventLd(c, site, e))],
  });
}

// ------------------------------------------------------------- Jazz Cafè

function renderJazz(c, site) {
  const j = site.jazzcafe;
  const body = `
<section class="jc-hero bg-photo" style="${bg(c, j.hero.sfondo)}">
  <div class="jc-hero-box">
    <h1>${esc(j.hero.titolo)}</h1>
    <hr class="divider">
  </div>
</section>

<section class="jc-concerti section bg-grigio-chiaro">
  <div class="container">
    <h2 class="big-title">${esc(j.concerti.titolo)}</h2>
    <div class="split top">
      <div class="reveal">
        ${rich(j.concerti.testo)}
        <p class="btn-row"><a class="btn btn-lg btn-wa" href="${esc(whatsappUrl(site, 'Ciao, vorrei prenotare un tavolo al Jazz Cafè per '))}" target="_blank" rel="noopener">${ICON_WA}<span>Prenota un tavolo</span></a></p>
      </div>
      <div class="reveal">
        ${img(c, j.concerti.immagine, 'Concerto al Jazz Cafè', '', true, '(max-width: 719px) 92vw, 540px')}
        <h2 class="mid-title">${esc(j.concerti.frase)}</h2>
      </div>
    </div>
  </div>
</section>

<section class="ristorante">
  <div class="col-media">
    ${slideshow(c, j.ristorante.foto, 'Unisono Jazz Cafè')}
  </div>
  <div class="col-text bg-rosso-scuro dark">
    <h2>${esc(j.ristorante.titolo)}</h2>
    ${rich(j.ristorante.testo)}
  </div>
</section>
`;
  return layout(c, site, {
    title: 'Unisono Jazz Cafè & Restaurant – UNISONO Factory', body, active: 'jazz',
    description: j.descrizione || j.concerti.testo, image: j.hero.sfondo, path: 'unisono-jazz-cafe-restaurant/',
  });
}

// ------------------------------------------------------------- Scuola & Corsi

function renderScuola(c, site) {
  const s = site.scuola;
  const mc = (s.masterclass.corsi || []).map((m) => `
      <p><em><strong>${esc(m.titolo)}</strong></em></p>
      <p>${esc(m.testo)}</p>
      <p><a class="btn btn-pdf" href="${esc(c.asset(m.pdf))}" target="_blank" rel="noopener">${esc(m.pulsante || 'Download PDF')}</a></p>`).join('');

  const body = `
<section class="page-hero scuola-hero${s.hero.sfondo ? ' bg-photo dark' : ''}"${s.hero.sfondo ? ` style="${bg(c, s.hero.sfondo)}"` : ''}>
  <h1>${esc(s.hero.titolo)}</h1>
</section>

<section class="band bg-rosso-scuro">
  <div class="container">
    <h2>${lines(s.intro.titolo)}</h2>
    <p>${esc(s.intro.sottotitolo)}</p>
  </div>
</section>

<section class="split-full">
  <div class="col-img" style="${bg(c, s.centro.immagine)}"></div>
  <div class="col-text bg-navy dark">
    <h2 class="big-title">${esc(s.centro.titolo)}</h2>
    ${rich(s.centro.testo)}
  </div>
</section>

<section class="band small bg-rosso-scuro">
  <div class="container"><h2>${esc(s.banda.testo)}</h2></div>
</section>

<section class="corsi section bg-grigio-chiaro">
  <div class="container split top">
    <div class="reveal" style="padding-top:40px">
      <h3 class="display">${esc(s.corsi.titolo)}</h3>
      ${rich(s.corsi.testo)}
    </div>
    <div class="reveal">
      <h3 class="display center">${esc(s.masterclass.titolo)}</h3>${mc}
      <div class="workshop">${rich(s.workshop.testo)}</div>
    </div>
  </div>
</section>

<section class="band bg-photo" style="${bg(c, s.banda2.sfondo)};--overlay:rgba(151,25,26,.92)">
  <div class="container"><h2 style="font-size:29px">${esc(s.banda2.testo)}</h2></div>
</section>

${related(c, s.correlati)}

${contactBlock(c, site)}
`;
  return layout(c, site, {
    title: 'Scuola & Corsi – UNISONO Factory', body, active: 'centro',
    description: s.descrizione || s.centro.testo, image: s.centro.immagine, path: 'scuola-di-musica/',
  });
}

// ------------------------------------------------------------- Studios

function renderStudios(c, site) {
  const s = site.studios;
  const sale = (s.sale || []).map((sala, i) => `
<section class="hall ${i % 2 ? 'bg-grigio' : 'bg-grigio-chiaro'}">
  <div class="container split">
    <div class="hall-media bg-photo" style="${bg(c, sala.sfondo)}">
      ${slideshow(c, sala.foto, sala.titolo, '(max-width: 719px) 92vw, 360px')}
    </div>
    <div class="reveal">
      <h2>${esc(sala.titolo)}</h2>
      ${rich(sala.testo)}
    </div>
  </div>
</section>`).join('\n');

  const body = `
<section class="page-hero studios-hero bg-photo dark" style="${bg(c, s.hero.sfondo)}">
  <div class="container hero-title">
    ${img(c, s.hero.logo, 'Unisono Records', '', false, '110px')}
    <h1>${esc(s.hero.titolo)}</h1>
  </div>
</section>

<section class="studio-gallery bg-photo" style="${bg(c, s.galleria.sfondo)}">
  <div class="container">
    ${slideshow(c, s.galleria.foto, 'Unisono Studios', '(max-width: 959px) 92vw, 900px')}
  </div>
</section>

<section class="section bg-grigio">
  <div class="container center reveal">
    <h2><strong>${esc(s.control.titolo)}</strong></h2>
    ${rich(s.control.testo)}
  </div>
</section>
${sale}

<section class="section">
  <div class="container servizi reveal">
    <h2 style="margin-bottom:48px">${esc(s.servizi.titolo)}</h2>
    ${rich(s.servizi.testo)}
    <p class="btn-row center-row"><a class="btn btn-lg btn-wa" href="${esc(whatsappUrl(site, 'Ciao, vorrei informazioni su Unisono Studios per '))}" target="_blank" rel="noopener">${ICON_WA}<span>Chiedi un preventivo</span></a></p>
  </div>
</section>
`;
  return layout(c, site, {
    title: `${s.hero.titolo} – UNISONO Factory`, body, active: 'studios',
    description: s.descrizione || s.control.testo, image: s.hero.sfondo, path: 'recording/',
  });
}

// ------------------------------------------------------------- Music Ambassador Award

function renderAward(c, site) {
  const a = site.award;
  const body = `
<section class="page-hero maa-hero bg-photo dark" style="${bg(c, a.hero.sfondo)}">
  <div class="container"><h1>${lines(a.hero.titolo)}</h1></div>
</section>

<section class="split-full maa-visione">
  <div class="col-text">
    <h2 class="big-title">${esc(a.visione.titolo)}</h2>
    ${rich(a.visione.testo)}
  </div>
  <div class="col-img" style="${bg(c, a.visione.immagine)}"></div>
</section>

<section class="maa-list section bg-photo dark" style="${bg(c, a.vincitori.sfondo)}">
  <div class="palazzo-box reveal">
    <h2>${lines(a.vincitori.titolo)}</h2>
    <hr class="divider">
    ${rich(a.vincitori.testo)}
  </div>
</section>

<section class="band bg-rosso-scuro">
  <div class="container"><h2 style="font-size:29px">${esc(a.banda.testo)}</h2></div>
</section>

${related(c, a.correlati)}

${contactBlock(c, site)}
`;
  return layout(c, site, {
    title: 'Music Ambassador Award – UNISONO Factory', body, active: 'centro',
    description: a.descrizione || a.visione.testo, image: a.hero.sfondo, path: 'music-ambassador-award/',
  });
}

// ------------------------------------------------------------- Eventi e novità

// Ora locale di inizio ("21.30" -> "T21:30"): Google la interpreta nel fuso del luogo dell'evento
function timeOf(orario) {
  const m = /(\d{1,2})[.:](\d{2})/.exec(orario || '');
  return m ? `T${m[1].padStart(2, '0')}:${m[2]}` : '';
}

function eventLd(c, site, ev) {
  const start = ev.data + timeOf(ev.orario);
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.titolo,
    startDate: start,
    ...(ev.data_fine ? { endDate: ev.data_fine } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [c.absolute(ev.locandina)],
    description: truncate(plainText(ev.testo), 300),
    url: c.absolute(eventPath(ev)),
    location: {
      '@type': 'Place',
      name: ev.luogo ? `${ev.luogo} – Palazzo Guarnieri` : 'Palazzo Guarnieri',
      address: { '@type': 'PostalAddress', addressLocality: 'Feltre', postalCode: '32032', addressRegion: 'BL', addressCountry: 'IT' },
    },
    organizer: { '@type': 'Organization', name: 'UNISONO Factory', url: c.absolute('') },
  };
}

function renderEvento(c, site, ev) {
  const meta = formatDateRange(ev.data, ev.data_fine);
  const end = eventEnd(ev);
  const past = isPast(ev, c.today);
  const isNovita = ev.tipo === 'novita';
  const msg = isNovita
    ? `Ciao, vorrei informazioni su "${ev.titolo}"`
    : `Ciao, vorrei prenotare per "${ev.titolo}"${meta ? ` (${meta})` : ''}. Siamo in `;
  const infoBox = `<div class="event-box"${end ? ` data-fine="${end}"` : ''}>
        ${meta ? `<p>${ICON_CAL}<span>${esc(meta)}</span></p>` : ''}
        ${ev.orario ? `<p>${ICON_CLOCK}<span>${esc(ev.orario)}</span></p>` : ''}
        ${ev.luogo ? `<p>${ICON_PIN}<span>${esc(ev.luogo)}</span></p>` : ''}
        <p class="event-past"${past ? '' : ' hidden'}>Questo evento si è già svolto. <a href="${c.p}index.html#events">Guarda i prossimi eventi →</a></p>
        <div class="btn-row event-actions"${past ? ' hidden' : ''}>
          <a class="btn btn-lg btn-wa" href="${esc(whatsappUrl(site, msg))}" target="_blank" rel="noopener">${ICON_WA}<span>${isNovita ? 'Chiedi informazioni' : 'Prenota su WhatsApp'}</span></a>
          <a class="btn btn-lg btn-outline-dark" href="tel:${tel(site.contatti.telefono)}">${ICON_PHONE}<span>Chiama</span></a>
        </div>
      </div>`;
  const body = `
<section class="evento section bg-grigio-chiaro">
  <div class="container split top">
    <div>${img(c, ev.locandina, ev.titolo, '', false, '(max-width: 719px) 92vw, 500px')}</div>
    <div>
      ${infoBox}
      ${rich(ev.testo)}
    </div>
  </div>
</section>
`;
  return layout(c, site, {
    title: `${ev.titolo} – UNISONO Factory`, body, active: 'eventi',
    description: [meta, ev.orario, plainText(ev.testo)].filter(Boolean).join(' · '),
    image: ev.locandina, path: eventPath(ev),
    ld: ev.data ? [eventLd(c, site, ev)] : [],
  });
}

function renderArchivio(c, site, eventi) {
  const list = sortEvents((eventi.eventi || []).filter((e) => e.tipo !== 'novita' && e.visibile !== false && e.data)).reverse();
  const cards = list.map((e) => card(c, e, 'Vedi', { hidden: !isPast(e, c.today) })).join('\n        ');
  const body = `
<section class="page-hero archivio-hero bg-photo dark" style="${bg(c, site.home.hero.sfondo)}">
  <div class="container"><h1>Eventi passati</h1></div>
</section>
<section class="section bg-grigio-chiaro archivio">
  <div class="container">
    <p class="center intro-text">I concerti e gli eventi che si sono già svolti a Palazzo Guarnieri.</p>
    <div class="cards">
        ${cards}
    </div>
    <p class="center"><a class="btn btn-lg" href="${c.p}index.html#events">Torna ai prossimi eventi</a></p>
  </div>
</section>
`;
  return layout(c, site, { title: 'Eventi passati – UNISONO Factory', body, active: 'eventi', path: 'eventi-passati/' });
}

function renderLegale(c, site, kind) {
  const l = site.legali || {};
  const title = kind === 'privacy' ? 'Privacy Policy' : 'Cookie Policy';
  const body = `
<section class="section legal">
  <div class="container legal-text">
    <h1>${title}</h1>
    ${rich(kind === 'privacy' ? l.privacy : l.cookie)}
  </div>
</section>
`;
  return layout(c, site, { title: `${title} – UNISONO Factory`, body, path: `${kind}-policy/` });
}

// ------------------------------------------------------------- API pubblica

function depthOf(path) {
  return path.split('/').length - 1;
}

// Restituisce l'HTML di una pagina. id: 'home' | 'jazzcafe' | ... | 'evento:<slug>'
// opts: prefix e resolve (anteprima), optimizeImages e siteUrl (pubblicazione), today (test)
export function renderPage(id, content, opts = {}) {
  const { site, eventi } = content;
  const options = { siteUrl: site.generale.url_sito, ...opts };
  if (id.startsWith('evento:')) {
    const slug = id.slice(7);
    const ev = (eventi.eventi || []).find((e) => e.slug === slug);
    if (!ev) throw new Error('Evento non trovato: ' + slug);
    return renderEvento(makeCtx(depthOf(eventPath(ev)), options), site, ev);
  }
  const page = PAGES.find((p) => p.id === id);
  if (!page) throw new Error('Pagina sconosciuta: ' + id);
  const c = makeCtx(depthOf(page.path), options);
  switch (id) {
    case 'home': return renderHome(c, site, eventi);
    case 'jazzcafe': return renderJazz(c, site);
    case 'scuola': return renderScuola(c, site);
    case 'award': return renderAward(c, site);
    case 'studios': return renderStudios(c, site);
    case 'archivio': return renderArchivio(c, site, eventi);
    case 'privacy': return renderLegale(c, site, 'privacy');
    case 'cookie': return renderLegale(c, site, 'cookie');
  }
  return '';
}

// Tutte le pagine del sito: [{ path, html }]
export function renderSite(content, opts = {}) {
  const out = PAGES.map((p) => ({ path: p.path, html: renderPage(p.id, content, opts) }));
  for (const ev of content.eventi.eventi || []) {
    out.push({ path: eventPath(ev), html: renderPage('evento:' + ev.slug, content, opts) });
  }
  return out;
}

// Indirizzi riservati (non utilizzabili come indirizzo di un evento)
export const RESERVED_SLUGS = new Set(['admin', 'api', 'assets', 'css', 'js', 'lib', 'content', 'scripts', 'scuola', '_vercel',
  ...PAGES.map((p) => p.path.split('/')[0]).filter((s) => s !== 'index.html')]);

export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'evento';
}
