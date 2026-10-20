import { httpGetText } from './http';
import { XMLParser } from 'fast-xml-parser';

const BASE = 'https://flibusta.is';

export interface FlibustaBook {
  id: string;
  title: string;
  author: string;
  formats: { fb2?: string; epub?: string; pdf?: string };
  cover?: string;
}

export async function search(query: string): Promise<FlibustaBook[]> {
  const url = `${BASE}/opds/search?searchTerm=${encodeURIComponent(query)}`;
  const xml = await httpGetText(url);
  return parseOpds(xml);
}

function parseOpds(xml: string): FlibustaBook[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const feed = parser.parse(xml).feed;
  const entries = feed?.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [];
  return entries.map((entry: any) => {
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const find = (type: string) => links.find((l: any) => l['@_type'] === type);
    const fb2 = find('application/fb2+zip');
    const epub = find('application/epub+zip');
    const pdf = find('application/pdf');
    const cover = links.find((l: any) => l['@_rel'] === 'http://opds-spec.org/image');
    return {
      id: String(entry.id),
      title: String(entry.title),
      author: entry.author?.name ? String(entry.author.name) : '',
      formats: {
        fb2: fb2 ? new URL(fb2['@_href'], BASE).href : undefined,
        epub: epub ? new URL(epub['@_href'], BASE).href : undefined,
        pdf: pdf ? new URL(pdf['@_href'], BASE).href : undefined,
      },
      cover: cover ? new URL(cover['@_href'], BASE).href : undefined,
    };
  });
}
