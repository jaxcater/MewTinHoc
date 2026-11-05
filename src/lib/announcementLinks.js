// Only explicit HTTP(S) URLs become clickable; all other content stays text.
export function splitAnnouncementLinks(message) {
  const text = String(message || '');
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    let url = match[0].replace(/[.,!?;:…]+$/u, '');
    // Keep balanced URL parentheses, but leave sentence punctuation outside.
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (url.endsWith(close) && url.split(close).length > url.split(open).length) {
        url = url.slice(0, -1);
      }
    }
    url = url.replace(/[.,!?;:…]+$/u, '');
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) continue;
      if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
      parts.push({ text: url, href: parsed.href });
      cursor = match.index + url.length;
    } catch { /* Invalid URLs remain ordinary text. */ }
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
