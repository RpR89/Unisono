// Genera il sito pubblicabile nella cartella dist/ a partire da content/*.json.
// Vercel lo esegue a ogni pubblicazione (vedi vercel.json).

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite } from '../lib/render.mjs';
import { validateContent } from '../lib/validate.mjs';
import { gitBlobSha } from '../api/_lib/store.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function loadContent(root = ROOT) {
  const siteText = await readFile(join(root, 'content/site.json'), 'utf8');
  const eventiText = await readFile(join(root, 'content/eventi.json'), 'utf8');
  return {
    site: JSON.parse(siteText),
    eventi: JSON.parse(eventiText),
    // Versione dei contenuti: il pannello la usa per sapere quando le modifiche sono online
    versione: { site: gitBlobSha(siteText), eventi: gitBlobSha(eventiText) },
  };
}

const REDIRECT_SCUOLA = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Scuola &amp; Corsi – UNISONO Factory</title>
<meta http-equiv="refresh" content="0; url=../scuola-di-musica/index.html">
<link rel="canonical" href="../scuola-di-musica/index.html"></head>
<body><p><a href="../scuola-di-musica/index.html">Scuola &amp; Corsi</a></p></body></html>
`;

export async function build({ root = ROOT, out = join(ROOT, 'dist'), quiet = false } = {}) {
  const content = await loadContent(root);
  const errors = validateContent(content);
  if (errors.length) throw new Error('Contenuti non validi:\n- ' + errors.join('\n- '));

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  for (const dir of ['css', 'js', 'assets', 'admin', 'lib']) {
    await cp(join(root, dir), join(out, dir), { recursive: true });
  }

  const pages = renderSite(content);
  for (const { path, html } of pages) {
    const file = join(out, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }

  await writeFile(join(out, 'version.json'), JSON.stringify(content.versione) + '\n');

  await mkdir(join(out, 'scuola'), { recursive: true });
  await writeFile(join(out, 'scuola/index.html'), REDIRECT_SCUOLA);

  if (!quiet) console.log(`Sito generato in ${out}: ${pages.length} pagine.`);
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
