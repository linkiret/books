// Парсер FB2 → HTML. FB2 — это XML, поэтому DOMParser справляется.
// Поддерживает: title, epigraph, poem, cite, empty-line, p, subtitle, image, emphasis, strong.

export interface Fb2Parsed {
  title: string;
  author: string;
  html: string;
}

export function parseFb2(text: string): Fb2Parsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('FB2: не удалось распарсить XML');

  const titleInfo = doc.querySelector('description > title-info');
  const bookTitle =
    titleInfo?.querySelector('book-title')?.textContent?.trim() || 'Без названия';

  const authorEls = titleInfo?.querySelectorAll('author') || [];
  const authors = Array.from(authorEls)
    .map((a) => {
      const first = a.querySelector('first-name')?.textContent?.trim() || '';
      const last = a.querySelector('last-name')?.textContent?.trim() || '';
      const nick = a.querySelector('nickname')?.textContent?.trim() || '';
      return `${first} ${last}`.trim() || nick;
    })
    .filter(Boolean);
  const author = authors.join(', ') || 'Неизвестный автор';

  // Бинарные картинки лежат в <binary id="...">base64</binary>
  const binaries = new Map<string, string>();
  doc.querySelectorAll('binary').forEach((b) => {
    const id = b.getAttribute('id');
    const ct = b.getAttribute('content-type') || 'image/jpeg';
    const data = b.textContent?.trim();
    if (id && data) binaries.set(id, `data:${ct};base64,${data}`);
  });

  const body = doc.querySelector('body');
  const html = body ? renderNode(body, binaries) : '<p>FB2: тело книги пустое</p>';

  return { title: bookTitle, author, html };
}

function renderNode(node: Element, binaries: Map<string, string>): string {
  const parts: string[] = [];
  for (const child of Array.from(node.children)) {
    parts.push(renderElement(child, binaries));
  }
  return parts.join('');
}

function renderElement(el: Element, binaries: Map<string, string>): string {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case 'section':
      return `<section>${renderNode(el, binaries)}</section>`;
    case 'title':
      return `<h2>${inlineChildren(el, binaries)}</h2>`;
    case 'subtitle':
      return `<h3>${inlineChildren(el, binaries)}</h3>`;
    case 'p':
      return `<p>${inlineChildren(el, binaries)}</p>`;
    case 'empty-line':
      return '<div class="empty-line"></div>';
    case 'epigraph':
      return `<div class="epigraph">${renderNode(el, binaries)}</div>`;
    case 'poem':
      return `<div class="poem">${renderNode(el, binaries)}</div>`;
    case 'stanza':
      return `<div class="stanza">${renderNode(el, binaries)}</div>`;
    case 'v':
      return `<p>${inlineChildren(el, binaries)}</p>`;
    case 'cite':
      return `<blockquote>${renderNode(el, binaries)}</blockquote>`;
    case 'emphasis':
      return `<em>${inlineChildren(el, binaries)}</em>`;
    case 'strong':
      return `<strong>${inlineChildren(el, binaries)}</strong>`;
    case 'image': {
      const href = el.getAttribute('l:href') || el.getAttribute('xlink:href') || el.getAttribute('href');
      if (href && href.startsWith('#')) {
        const src = binaries.get(href.slice(1));
        if (src) return `<img src="${src}" alt="" />`;
      }
      return '';
    }
    case 'a': {
      const href = el.getAttribute('l:href') || el.getAttribute('href');
      if (href && href.startsWith('#')) {
        return `<a href="${escapeAttr(href)}">${inlineChildren(el, binaries)}</a>`;
      }
      return inlineChildren(el, binaries);
    }
    default:
      return renderNode(el, binaries);
  }
}

function inlineChildren(el: Element, binaries: Map<string, string>): string {
  const parts: string[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(escapeHtml(child.textContent || ''));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      parts.push(renderElement(child as Element, binaries));
    }
  }
  return parts.join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// FB2 может быть в windows-1251. TextDecoder поддерживает эту кодировку в браузерах.
export function decodeFb2(bytes: Uint8Array): string {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 200));
  const match = head.match(/encoding=["']([^"']+)["']/i);
  const enc = (match?.[1] || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(enc).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}
