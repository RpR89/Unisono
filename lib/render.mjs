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
};

export function eventPath(ev) {
  return `${ev.slug}/index.html`;
}

const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1C8.7 6.4 8.5 5.2 8.5 4c0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>';
const ICON_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>';
const ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>';

// Contesto di rendering: gestisce i percorsi relativi delle risorse
function makeCtx(depth, opts = {}) {
  const p = opts.prefix ?? '../'.repeat(depth);
  const asset = (path) => {
    if (!path) return '';
    if (opts.resolve) return opts.resolve(path);
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return p + path;
  };
  const link = (target) => {
    if (!target) return '#';
    if (LINK_TARGETS[target]) return p + LINK_TARGETS[target];
    return asset(safeUrl(target)) || '#';
  };
  return { p, asset, link };
}

// Utility di testo
const rich = (html) => sanitizeRich(html);
const lines = (text) => esc(text).replace(/\r?\n/g, '<br>');
const tel = (phone) => '+39' + String(phone || '').replace(/[^0-9]/g, '');

function phoneLine(site) {
  const c = site.contatti;
  return `(+39) <em><strong>${esc(c.telefono)}</strong></em>`;
}

function isExternal(url) {
  return /^https?:/i.test(url || '');
}

function externalAttrs(url) {
  return isExternal(url) || /\.pdf$/i.test(url || '') ? ' target="_blank" rel="noopener"' : '';
}

function img(c, path, alt = '', cls = '', lazy = true) {
  if (!path) return '';
  return `<img src="${esc(c.asset(path))}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy"' : ''}>`;
}

function bg(c, path) {
  if (!path) return '';
  return `background-image:url('${esc(c.asset(path)).replace(/'/g, '%27')}')`;
}

// ------------------------------------------------------------- Struttura comune

function header(c, site, active, transparent) {
  const cls = (key) => (key === active ? ' class="active"' : '');
  return `<header class="site-header${transparent ? ' transparent' : ''}">
  <div class="header-inner">
    <a class="logo" href="${c.p}index.html" aria-label="UNISONO Factory - Home">
      <img src="${esc(c.asset(site.generale.logo_header))}" alt="UNISONO Factory" width="122" height="52">
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
      </ul>
    </nav>
  </div>
</header>`;
}

function footer(c, site) {
  const g = site.generale;
  const ct = site.contatti;
  const az = site.azienda;
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
        <p><a class="ico" href="mailto:${esc(ct.email)}">${ICON_MAIL}<span>${esc(ct.email)}</span></a></p>
      </div>
      <div>
        <h4>Privacy</h4>
        <p><a href="${esc(c.link(g.privacy_url) )}">Privacy Policy</a><br><a href="${esc(c.link(g.cookie_url))}">Cookie Policy</a></p>
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
<button class="to-top" type="button" aria-label="Torna su">&#8963;</button>`;
}

function layout(c, site, { title, body, active = '', transparent = false, home = false, description = '' }) {
  const desc = description || site.generale.descrizione;
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="icon" type="image/png" href="${esc(c.asset(site.generale.logo_footer))}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Lato:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${c.p}css/style.css">
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

function card(c, href, image, title) {
  return `<article class="card">
          <a class="card-media" href="${href}">${img(c, image, title)}</a>
          <h3><a href="${href}">${esc(title)}</a></h3>
          <a class="btn" href="${href}">Read More</a>
        </article>`;
}

function contactBlock(c, site) {
  const m = site.modulo;
  return `<section class="scrivici">
  <div class="container"><h2>${lines(m.titolo)}</h2></div>
</section>
<section class="contatto bg-photo" style="${bg(c, m.sfondo)}">
  <div class="container">
    <h3>${esc(m.sottotitolo)}</h3>
    ${rich(m.testo)}
    <form class="contact-form" data-to="${esc(m.email_destinatario || site.contatti.email)}">
      <div class="form-field"><label for="nome">Nome e cognome (required)</label><input id="nome" name="nome" type="text" required autocomplete="name"></div>
      <div class="form-field"><label for="email">Email (required)</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="form-field"><label for="messaggio">Message</label><textarea id="messaggio" name="messaggio"></textarea></div>
      <p class="form-privacy"><label><input type="checkbox" required> Cliccando su INVIA accetto la Privacy Policy di questo sito web (<a href="${esc(c.link(site.generale.privacy_url))}">Privacy Policy</a>, <a href="${esc(c.link(site.generale.cookie_url))}">Cookie Policy</a>) e sono a conoscenza che per cancellare immediatamente i dati inviati sono tenuto a inviare un'email a <a href="mailto:${esc(site.contatti.email_privacy)}">${esc(site.contatti.email_privacy)}</a> specificando la mia richiesta</label></p>
      <button class="btn btn-lg" type="submit">Invia</button>
    </form>
  </div>
</section>`;
}

function related(c, data) {
  const tiles = (data.schede || []).map((t) =>
    `<a class="tile${t.immagine ? '' : ' plain'}" href="${esc(c.link(t.link))}" ${t.immagine ? ` style="${bg(c, t.immagine)}"` : ''}><h3>${esc(t.titolo)}</h3></a>`).join('');
  return `<section class="band small bg-navy"><div class="container"><h2>${esc(data.titolo)}</h2></div></section>
<section class="related bg-photo" style="${bg(c, data.sfondo)}">
  <div class="tiles">${tiles}</div>
</section>`;
}

function slideshow(c, images, alt) {
  return `<div class="slideshow">${(images || []).map((src) => img(c, src, alt)).join('')}</div>`;
}

// ------------------------------------------------------------- Home

function renderHome(c, site, eventi) {
  const h = site.home;
  const visibili = (eventi.eventi || []).filter((e) => e.visibile !== false);
  const ev = visibili.filter((e) => e.tipo !== 'novita');
  const nov = visibili.filter((e) => e.tipo === 'novita');
  const evCard = (e) => card(c, c.p + eventPath(e), e.immagine_home || e.locandina, e.titolo);

  // Il carosello del Centro di Musica ripete le schede per riempire lo spazio
  let tiles = h.centro.schede || [];
  const repeated = [];
  if (tiles.length) while (repeated.length < 6) repeated.push(...tiles);
  const tilesHtml = repeated.slice(0, Math.max(6, tiles.length)).map((t) =>
    `<a class="tile${t.immagine ? '' : ' plain'}" href="${esc(c.link(t.link))}" ${t.immagine ? ` style="${bg(c, t.immagine)}"` : ''}><h3>${esc(t.titolo)}</h3></a>`).join('\n      ');

  const masterclass = (h.masterclass.corsi || []).map((m) => `
      <div class="reveal">
        ${img(c, m.immagine, '')}
        ${rich(m.testo)}
        <hr class="divider divider-short">
        <h2 class="download-info"><a href="${esc(c.asset(m.pdf))}" target="_blank" rel="noopener"><strong>${esc(m.pulsante || 'DOWNLOAD INFO')}</strong></a></h2>
      </div>`).join('');

  const body = `
<section class="hero">
  <div class="hero-bg" style="${bg(c, h.hero.sfondo)}"></div>
  <h1 class="sr-only">UNISONO Factory</h1>
  ${img(c, h.hero.logo, 'UNISONO', 'hero-logo', false)}
</section>

<section id="events" class="section bg-grigio-chiaro">
  <div class="container">
    <h2 class="center">${esc(h.eventi.titolo)}</h2>
    <div class="cards-box">
      <div class="cards">
        ${ev.map(evCard).join('\n        ')}
      </div>
    </div>
    <h2 class="info-line">${esc(h.eventi.info)} <a href="tel:${tel(site.contatti.telefono)}" style="text-decoration:none">${phoneLine(site)}</a></h2>
  </div>
</section>

<section class="section bg-grigio-chiaro" style="padding-top:24px">
  <div class="container">
    <h2 class="center">${esc(h.novita.titolo)}</h2>
    <div class="novita-grid" style="margin-top:36px">
      <div class="novita-logo">${img(c, h.novita.logo, 'Unisono Records')}</div>
      ${nov.map(evCard).join('\n      ')}
    </div>
    <h2 class="info-line">${esc(h.novita.info)} <a href="tel:${tel(site.contatti.telefono)}" style="text-decoration:none">${phoneLine(site)}</a></h2>
  </div>
</section>

<section id="masterclass" class="section">
  <div class="container">
    <h2 class="center" style="margin-bottom:36px">${esc(h.masterclass.titolo)}</h2>
    <div class="masterclass-grid">${masterclass}
    </div>
  </div>
</section>

<section class="mondo bg-photo dark" style="${bg(c, h.mondo.sfondo)}">
  <div class="container center reveal">
    ${img(c, h.mondo.logo, 'UNISONO Factory')}
    <h3><strong>${esc(h.mondo.titolo)}</strong></h3>
    ${rich(h.mondo.testo)}
  </div>
</section>

<section class="jazz bg-photo dark" style="${bg(c, h.jazz.sfondo)}">
  <div class="container split">
    <div class="jazz-left reveal">
      ${img(c, h.jazz.logo, 'Unisono Jazz Cafè')}
      <h2 class="big-title">${lines(h.jazz.titolo)}</h2>
      <hr class="divider divider-red">
      <a class="btn btn-xl btn-rosso" href="${c.p}unisono-jazz-cafe-restaurant/index.html">${esc(h.jazz.pulsante)}</a>
    </div>
    <div class="reveal">
      ${rich(h.jazz.testo)}
    </div>
  </div>
</section>

<section class="centro bg-photo dark" style="${bg(c, h.centro.sfondo)}">
  <div class="container">
    ${img(c, h.centro.logo, 'Centro di Musica UNISONO', 'centro-logo')}
    <hr class="divider">
    <div class="centro-text reveal">
      ${rich(h.centro.testo)}
    </div>
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

<section class="studios bg-photo dark" style="${bg(c, h.studios.sfondo)}">
  <div class="container split">
    <div class="center reveal">
      <h2 class="big-title">${lines(h.studios.titolo)}</h2>
      <hr class="divider divider-blue">
      <a class="btn btn-xl btn-blu" href="${c.p}recording/index.html">${esc(h.studios.pulsante)}</a>
    </div>
    <div class="reveal">
      ${rich(h.studios.testo)}
    </div>
  </div>
</section>

<section class="family section">
  <div class="container split">
    <div class="reveal">
      <h2 class="big-title">${lines(h.family.titolo)}</h2>
      ${rich(h.family.testo)}
      <hr class="divider divider-blue">
      <a class="btn btn-xl btn-blu" href="${esc(c.asset(h.family.pdf))}" target="_blank" rel="noopener">${esc(h.family.pulsante)}</a>
    </div>
    <a class="reveal" href="${esc(c.asset(h.family.pdf))}" target="_blank" rel="noopener">${img(c, h.family.immagine, 'Unisono Family')}</a>
  </div>
</section>

<section class="palazzo bg-photo dark" style="${bg(c, h.palazzo.sfondo)}">
  <div class="palazzo-box reveal">
    <h2>${esc(h.palazzo.titolo)}<small>${esc(h.palazzo.sottotitolo)}</small></h2>
    ${rich(h.palazzo.testo)}
    <hr class="divider">
  </div>
</section>

<section class="gallery bg-photo dark" style="${bg(c, h.gallery.sfondo)}">
  <div class="container split">
    <div class="collage reveal">
      ${(h.gallery.immagini || []).slice(0, 3).map((src) => img(c, src)).join('\n      ')}
    </div>
    <div class="reveal">
      <h2>${esc(h.gallery.titolo)}</h2>
      ${rich(h.gallery.testo)}
      <a class="btn btn-lg btn-outline" href="${esc(c.link(h.gallery.link))}"${h.gallery.link ? externalAttrs(h.gallery.link) : ' aria-disabled="true"'}>${esc(h.gallery.pulsante)}</a>
    </div>
  </div>
</section>

<section class="sponsor section bg-grigio-chiaro">
  <div class="container">
    <div class="sponsor-box">${img(c, h.sponsor.immagine, 'Main sponsor, partner e media partner')}</div>
    ${h.sponsor.banner ? `<a class="poc" href="${esc(safeUrl(h.sponsor.link) || '#')}" target="_blank" rel="noopener">${img(c, h.sponsor.banner, 'Progetto finanziato con il POC Regione del Veneto - Vai ai dettagli')}</a>` : ''}
  </div>
</section>
`;
  return layout(c, site, { title: 'UNISONO Factory', body, transparent: true, home: true });
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
      </div>
      <div class="reveal">
        ${img(c, j.concerti.immagine, 'Concerto al Jazz Cafè')}
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
  return layout(c, site, { title: 'Unisono Jazz Cafè & Restaurant – UNISONO Factory', body, active: 'jazz' });
}

// ------------------------------------------------------------- Scuola & Corsi

function renderScuola(c, site) {
  const s = site.scuola;
  const mc = (s.masterclass.corsi || []).map((m) => `
      <p><em><strong>${esc(m.titolo)}</strong></em></p>
      <p>${esc(m.testo)}</p>
      <p><a class="btn btn-pdf" href="${esc(c.asset(m.pdf))}" target="_blank" rel="noopener">${esc(m.pulsante || 'Download PDF')}</a></p>`).join('');

  const body = `
<section class="page-hero scuola-hero">
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
  return layout(c, site, { title: 'Scuola & Corsi – UNISONO Factory', body, active: 'centro' });
}

// ------------------------------------------------------------- Studios

function renderStudios(c, site) {
  const s = site.studios;
  const sale = (s.sale || []).map((sala, i) => `
<section class="hall ${i % 2 ? 'bg-grigio' : 'bg-grigio-chiaro'}">
  <div class="container split">
    <div class="hall-media bg-photo" style="${bg(c, sala.sfondo)}">
      ${slideshow(c, sala.foto, sala.titolo)}
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
    ${img(c, s.hero.logo, 'Unisono Records', '', false)}
    <h1>${esc(s.hero.titolo)}</h1>
  </div>
</section>

<section class="studio-gallery bg-photo" style="${bg(c, s.galleria.sfondo)}">
  <div class="container">
    ${slideshow(c, s.galleria.foto, 'Unisono Studios')}
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
  </div>
</section>
`;
  return layout(c, site, { title: `${s.hero.titolo} – UNISONO Factory`, body, active: 'studios' });
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
  return layout(c, site, { title: 'Music Ambassador Award – UNISONO Factory', body, active: 'centro' });
}

// ------------------------------------------------------------- Eventi e novità

function renderEvento(c, site, ev) {
  const body = `
<section class="evento section bg-grigio-chiaro">
  <div class="container split top">
    <div>${img(c, ev.locandina, ev.titolo, '', false)}</div>
    <div>
      ${rich(ev.testo)}
    </div>
  </div>
</section>
`;
  return layout(c, site, { title: `${ev.titolo} – UNISONO Factory`, body, active: 'eventi' });
}

// ------------------------------------------------------------- API pubblica

function depthOf(path) {
  return path.split('/').length - 1;
}

// Restituisce l'HTML di una pagina. id: 'home' | 'jazzcafe' | ... | 'evento:<slug>'
export function renderPage(id, content, opts = {}) {
  const { site, eventi } = content;
  if (id.startsWith('evento:')) {
    const slug = id.slice(7);
    const ev = (eventi.eventi || []).find((e) => e.slug === slug);
    if (!ev) throw new Error('Evento non trovato: ' + slug);
    const c = makeCtx(depthOf(eventPath(ev)), opts);
    return renderEvento(c, site, ev);
  }
  const page = PAGES.find((p) => p.id === id);
  if (!page) throw new Error('Pagina sconosciuta: ' + id);
  const c = makeCtx(depthOf(page.path), opts);
  switch (id) {
    case 'home': return renderHome(c, site, eventi);
    case 'jazzcafe': return renderJazz(c, site);
    case 'scuola': return renderScuola(c, site);
    case 'award': return renderAward(c, site);
    case 'studios': return renderStudios(c, site);
  }
  return '';
}

// Tutte le pagine del sito: [{ path, html }]
export function renderSite(content) {
  const out = PAGES.map((p) => ({ path: p.path, html: renderPage(p.id, content) }));
  for (const ev of content.eventi.eventi || []) {
    out.push({ path: eventPath(ev), html: renderPage('evento:' + ev.slug, content) });
  }
  return out;
}

// Pagine con un indirizzo riservato (non utilizzabile come slug di un evento)
export const RESERVED_SLUGS = new Set(['admin', 'api', 'assets', 'css', 'js', 'lib', 'content', 'scripts', 'scuola',
  ...PAGES.map((p) => p.path.split('/')[0]).filter((s) => s !== 'index.html')]);

export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'evento';
}
