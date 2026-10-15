// Controlli sui contenuti prima di salvarli o pubblicarli.

import { RESERVED_SLUGS } from './render.mjs';

const REQUIRED_SECTIONS = ['generale', 'contatti', 'azienda', 'modulo', 'home', 'jazzcafe', 'scuola', 'studios', 'award'];

// Un percorso di file valido: dentro assets/, senza risalire di cartella
export function isAssetPath(path) {
  return typeof path === 'string' && /^assets\/[A-Za-z0-9._\-/ °]+$/.test(path) && !path.includes('..');
}

function walkAssets(value, key, errors, where) {
  if (typeof value === 'string') {
    const isFileKey = /^(sfondo|logo|immagine|immagini|locandina|immagine_home|banner|pdf|foto|logo_header|logo_footer|sfondo_footer)$/.test(key);
    if (isFileKey && value && !isAssetPath(value)) errors.push(`${where}: percorso file non valido (${value})`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkAssets(v, key, errors, `${where}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkAssets(v, k, errors, `${where}.${k}`);
  }
}

export function validateContent(content) {
  const errors = [];
  const { site, eventi } = content || {};
  if (!site || typeof site !== 'object') return ['manca il file dei contenuti del sito'];
  if (!eventi || !Array.isArray(eventi.eventi)) return ['manca l\'elenco degli eventi'];

  for (const s of REQUIRED_SECTIONS) {
    if (!site[s] || typeof site[s] !== 'object') errors.push(`manca la sezione "${s}"`);
  }

  const slugs = new Set();
  eventi.eventi.forEach((ev, i) => {
    const where = `evento ${i + 1}${ev && ev.titolo ? ` (${ev.titolo})` : ''}`;
    if (!ev || typeof ev !== 'object') return errors.push(`${where}: non valido`);
    if (!ev.titolo || !String(ev.titolo).trim()) errors.push(`${where}: manca il titolo`);
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(ev.slug || '')) errors.push(`${where}: indirizzo della pagina non valido`);
    else if (RESERVED_SLUGS.has(ev.slug)) errors.push(`${where}: l'indirizzo "${ev.slug}" è riservato`);
    else if (slugs.has(ev.slug)) errors.push(`${where}: indirizzo della pagina duplicato`);
    slugs.add(ev.slug);
    if (ev.tipo !== 'evento' && ev.tipo !== 'novita') errors.push(`${where}: tipo non valido`);
  });

  walkAssets(site, '', errors, 'sito');
  walkAssets(eventi, '', errors, 'eventi');
  return errors;
}
