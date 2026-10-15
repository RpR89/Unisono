// Test automatici: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, cp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeRich } from '../lib/sanitize.mjs';
import { renderSite, renderPage, slugify } from '../lib/render.mjs';
import { validateContent, isAssetPath } from '../lib/validate.mjs';
import { build, loadContent } from '../scripts/build.mjs';
import { createSessionToken, verifySessionToken, hashPassword, verifyPassword } from '../api/_lib/auth.js';
import { encryptUsers, decryptUsers } from '../api/_lib/users.js';
import { GitHubStore, gitBlobSha } from '../api/_lib/store.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- Testo formattato

test('sanitizeRich tiene la formattazione semplice', () => {
  const html = '<p>Ciao <strong>mondo</strong> <em>bello</em></p><ul><li>uno</li></ul><h3>Titolo</h3>';
  assert.equal(sanitizeRich(html), html);
});

test('sanitizeRich toglie script, eventi e link pericolosi', () => {
  const out = sanitizeRich('<p onclick="x()">a<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a><iframe src="//x"></iframe></p>');
  assert.equal(out, '<p>a<a href="">b</a></p>');
  assert.doesNotMatch(sanitizeRich('<a href="JaVaScRiPt:alert(1)">x</a>'), /javascript/i);
  assert.doesNotMatch(sanitizeRich('<svg><script>alert(1)</script></svg>'), /script|svg/i);
});

test('sanitizeRich: i link esterni si aprono in una nuova scheda', () => {
  assert.equal(sanitizeRich('<a href="https://example.com">x</a>'), '<a href="https://example.com" target="_blank" rel="noopener">x</a>');
  assert.equal(sanitizeRich('<a href="mailto:a@b.it">x</a>'), '<a href="mailto:a@b.it">x</a>');
});

// ---------------------------------------------------------------- Contenuti e pagine

test('i contenuti attuali sono validi', async () => {
  const content = await loadContent(ROOT);
  assert.deepEqual(validateContent(content), []);
});

test('validateContent segnala gli errori', async () => {
  const content = structuredClone(await loadContent(ROOT));
  content.eventi.eventi[0].slug = 'admin';
  content.eventi.eventi[1].slug = content.eventi.eventi[2].slug;
  content.site.home.hero.sfondo = '../../etc/passwd';
  const errors = validateContent(content);
  assert.ok(errors.some((e) => e.includes('riservato')));
  assert.ok(errors.some((e) => e.includes('duplicato')));
  assert.ok(errors.some((e) => e.includes('percorso file non valido')));
});

test('isAssetPath accetta solo file dentro assets/', () => {
  assert.ok(isAssetPath('assets/img/1.jpg'));
  assert.ok(isAssetPath('assets/uploads/2026/10/locandina-abc123.jpg'));
  assert.ok(!isAssetPath('content/site.json'));
  assert.ok(!isAssetPath('assets/../content/site.json'));
});

test('il sito genera tutte le pagine con testi e immagini', async () => {
  const content = await loadContent(ROOT);
  const pages = renderSite(content);
  const paths = pages.map((p) => p.path);
  for (const p of ['index.html', 'unisono-jazz-cafe-restaurant/index.html', 'scuola-di-musica/index.html', 'recording/index.html', 'music-ambassador-award/index.html', 'm-s-s-m/index.html']) {
    assert.ok(paths.includes(p), p);
  }
  const home = pages.find((p) => p.path === 'index.html').html;
  assert.match(home, /I PROSSIMI EVENTI/);
  assert.match(home, /href="m-s-s-m\/index\.html"/);
  assert.match(home, /src="assets\/img\/MCCOMB\.jpg"/);
  const evento = pages.find((p) => p.path === 'm-s-s-m/index.html').html;
  assert.match(evento, /src="\.\.\/assets\/img\/MCCOMB-scaled\.png"/);
  assert.match(evento, /href="\.\.\/css\/style\.css"/);
});

test('gli eventi nascosti non compaiono nella Home ma la pagina resta', async () => {
  const content = structuredClone(await loadContent(ROOT));
  content.eventi.eventi.find((e) => e.slug === 'm-s-s-m').visibile = false;
  const home = renderPage('home', content);
  assert.doesNotMatch(home, /m-s-s-m\/index\.html/);
  assert.match(renderPage('evento:m-s-s-m', content), /Frank McComb/);
});

test('i testi semplici vengono protetti (niente HTML)', async () => {
  const content = structuredClone(await loadContent(ROOT));
  content.eventi.eventi[0].titolo = '<script>alert(1)</script>';
  const home = renderPage('home', content);
  assert.doesNotMatch(home, /<script>alert/);
  assert.match(home, /&lt;script&gt;/);
});

test('slugify crea indirizzi puliti', () => {
  assert.equal(slugify('Concerto di Natale – Più bello!'), 'concerto-di-natale-piu-bello');
});

test('build crea la cartella dist con version.json', async () => {
  const out = await mkdtemp(join(tmpdir(), 'unisono-'));
  try {
    await build({ out, quiet: true });
    const v = JSON.parse(await readFile(join(out, 'version.json'), 'utf8'));
    const text = await readFile(join(ROOT, 'content/site.json'), 'utf8');
    assert.equal(v.site, gitBlobSha(text));
    assert.match(await readFile(join(out, 'index.html'), 'utf8'), /<title>UNISONO Factory<\/title>/);
    await readFile(join(out, 'admin/index.html'));
    await readFile(join(out, 'scuola/index.html'));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- Accesso

test('password: hash e verifica', () => {
  const h = hashPassword('segreta123');
  assert.ok(verifyPassword('segreta123', h));
  assert.ok(!verifyPassword('sbagliata', h));
  assert.ok(!verifyPassword('segreta123', 'qualcosa'));
});

test('sessione: firma, scadenza e manomissione', () => {
  const now = Date.now();
  const token = createSessionToken('mario', now);
  assert.equal(verifySessionToken(token, now).u, 'mario');
  assert.equal(verifySessionToken(token, now + 13 * 3600 * 1000), null);
  const [payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ u: 'admin', exp: now + 1e9 })).toString('base64url');
  assert.equal(verifySessionToken(`${forged}.${sig}`, now), null);
  assert.equal(verifySessionToken(`${payload}.xxx`, now), null);
});

test('utenti: il file cifrato non contiene nomi in chiaro', () => {
  const users = [{ username: 'mario.rossi', hash: hashPassword('password123') }];
  const text = encryptUsers(users);
  assert.doesNotMatch(text, /mario/);
  assert.deepEqual(decryptUsers(text), users);
});

// ---------------------------------------------------------------- GitHub (simulato)

function fakeGitHub(files) {
  const calls = [];
  let head = 'c1';
  const blobs = {};
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace('/repos/RpR89/Unisono', '');
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push(`${method} ${path}`);
    if (method === 'GET' && path.startsWith('/contents/')) {
      const p = decodeURIComponent(path.slice(10));
      if (!(p in files)) return json(404, {});
      const text = files[p];
      return json(200, { content: Buffer.from(text).toString('base64'), sha: gitBlobSha(text) });
    }
    if (method === 'POST' && path === '/git/blobs') {
      const sha = 'b' + Object.keys(blobs).length;
      blobs[sha] = Buffer.from(body.content, 'base64');
      return json(201, { sha });
    }
    if (method === 'GET' && path === '/git/ref/heads/main') return json(200, { object: { sha: head } });
    if (method === 'GET' && path.startsWith('/git/commits/')) return json(200, { tree: { sha: 't-' + head } });
    if (method === 'POST' && path === '/git/trees') {
      for (const e of body.tree) files[e.path] = e.content ?? `blob:${e.sha}`;
      return json(201, { sha: 'tree-new' });
    }
    if (method === 'POST' && path === '/git/commits') return json(201, { sha: 'c2' });
    if (method === 'PATCH' && path === '/git/refs/heads/main') { head = body.sha; return json(200, {}); }
    return json(500, { message: 'non previsto ' + path });
  };
  return { fetchImpl, calls, files };
}

test('GitHubStore legge, carica e pubblica in un solo commit', async () => {
  const gh = fakeGitHub({ 'content/site.json': '{"a":1}\n' });
  const store = new GitHubStore({ token: 't', repo: 'RpR89/Unisono', branch: 'main', fetchImpl: gh.fetchImpl });
  const file = await store.readText('content/site.json');
  assert.equal(file.text, '{"a":1}\n');
  const id = await store.createUpload(Buffer.from('immagine'));
  const res = await store.commit({
    files: [{ path: 'assets/uploads/2026/10/x.jpg', upload: id }, { path: 'content/site.json', text: '{"a":2}\n' }],
    message: 'prova',
    expect: { 'content/site.json': file.sha },
  });
  assert.equal(res.commit, 'c2');
  assert.equal(gh.files['content/site.json'], '{"a":2}\n');
  assert.equal(gh.files['assets/uploads/2026/10/x.jpg'], `blob:${id}`);
  assert.equal(gh.calls.filter((c) => c.startsWith('PATCH')).length, 1);
});

test('GitHubStore rifiuta di sovrascrivere modifiche altrui', async () => {
  const gh = fakeGitHub({ 'content/site.json': '{"a":1}\n' });
  const store = new GitHubStore({ token: 't', repo: 'RpR89/Unisono', branch: 'main', fetchImpl: gh.fetchImpl });
  await assert.rejects(
    store.commit({ files: [{ path: 'content/site.json', text: '{}' }], message: 'x', expect: { 'content/site.json': 'vecchia' } }),
    (err) => err.status === 409,
  );
  assert.equal(gh.files['content/site.json'], '{"a":1}\n');
});
