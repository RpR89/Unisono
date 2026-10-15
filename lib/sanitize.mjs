// Pulizia del testo formattato scritto nel pannello.
// Tiene solo i tag di formattazione semplici e i link sicuri.
// Funziona sia nel browser (anteprima) sia in Node (generazione del sito).

const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4']);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math|textarea|select)\b[\s\S]*?<\/\1\s*>/gi;

export function safeUrl(url) {
  const u = String(url || '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
  return u;
}

function attr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function getAttr(attrs, name) {
  const m = new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(attrs);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? '').replace(/&amp;/g, '&');
}

export function sanitizeRich(html) {
  if (!html) return '';
  let s = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(DROP_WITH_CONTENT, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>/gi, '');

  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    const closing = full.startsWith('</');
    if (!ALLOWED.has(tag)) return tag === 'div' && closing ? '<br>' : '';
    if (closing) return tag === 'br' ? '' : `</${tag}>`;
    if (tag === 'a') {
      const href = safeUrl(getAttr(attrs, 'href'));
      const blank = /target\s*=\s*["']?_blank/i.test(attrs) || /^https?:/i.test(href);
      return `<a href="${attr(href)}"${blank ? ' target="_blank" rel="noopener"' : ''}>`;
    }
    return `<${tag}>`;
  });

  // Rimuove eventuali "<" rimasti che non formano un tag consentito
  s = s.replace(/<(?!\/?(p|br|strong|b|em|i|u|a|ul|ol|li|h2|h3|h4)\b)/gi, '&lt;');
  return s.trim();
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
