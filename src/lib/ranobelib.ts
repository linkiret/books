import { httpGet } from './http';

const BASE = 'https://api.cdnlibs.org/api';

const HEADERS = {
  'Site-Id': '3',
  'Referer': 'https://ranobelib.me/',
  'Accept': 'application/json',
  'Origin': 'https://ranobelib.me',
};

export interface RanobeLibTitle {
  id: number;
  name: string;
  rus_name: string;
  slug_url: string;
  cover: { default: string };
  summary: string;
}

export interface RanobeLibGenre {
  id: number;
  name: string;
  rus_name?: string;
}

export interface RanobeLibChapter {
  id: number;
  volume: string;
  number: string;
  name: string;
}

export async function search(query: string): Promise<RanobeLibTitle[]> {
  const url = `${BASE}/manga?q=${encodeURIComponent(query)}&site_id[]=3`;
  const res = await httpGet(url, HEADERS);
  return res.data || [];
}

export async function getGenres(): Promise<RanobeLibGenre[]> {
  const url = `${BASE}/constants?fields[]=genres`;
  const res = await httpGet(url, HEADERS);
  const raw = res.data?.genres || res.data || [];
  return Array.isArray(raw) ? raw : [];
}

export async function getCatalog(opts: {
  page?: number;
  genreId?: number | null;
  sortBy?: string;
}): Promise<{ items: RanobeLibTitle[]; lastPage: number }> {
  const page = opts.page || 1;
  const params = new URLSearchParams();
  params.set('site_id[]', '3');
  params.set('page', String(page));
  if (opts.sortBy) params.set('sort_by', opts.sortBy);
  if (opts.genreId) params.set('genres[]', String(opts.genreId));

  const url = `${BASE}/manga?${params.toString()}`;
  const res = await httpGet(url, HEADERS);
  return {
    items: res.data || [],
    lastPage: res.meta?.last_page || 1,
  };
}

export async function getChapters(slugUrl: string): Promise<RanobeLibChapter[]> {
  const url = `${BASE}/manga/${slugUrl}/chapters`;
  const res = await httpGet(url, HEADERS);
  return res.data || [];
}

export async function getChapterContent(
  slugUrl: string,
  volume: string,
  number: string
): Promise<string> {
  const url = `${BASE}/manga/${slugUrl}/chapter?number=${encodeURIComponent(number)}&volume=${encodeURIComponent(volume)}`;
  const res = await httpGet(url, HEADERS);
  const content = res.data.content;
  if (typeof content === 'string') return content;
  return prosemirrorToHtml(content, res.data.attachments || []);
}

function prosemirrorToHtml(doc: any, attachments: any[]): string {
  const parts: string[] = [];
  for (const node of doc.content || []) {
    if (node.type === 'paragraph') {
      const inner = (node.content || [])
        .map((n: any) => {
          if (n.type === 'text') {
            let t = escapeHtml(n.text || '');
            const marks = n.marks || [];
            for (const m of marks) {
              if (m.type === 'bold') t = `<strong>${t}</strong>`;
              else if (m.type === 'italic') t = `<em>${t}</em>`;
              else if (m.type === 'underline') t = `<u>${t}</u>`;
            }
            return t;
          }
          return '';
        })
        .join('');
      parts.push(`<p>${inner || '&nbsp;'}</p>`);
    } else if (node.type === 'image') {
      const id = node.attrs?.images?.[0]?.image;
      const att = attachments.find((a) => a.name === id);
      if (att) parts.push(`<img src="https://ranobelib.me${att.url}" style="max-width:100%" />`);
    } else if (node.type === 'hardBreak') {
      parts.push('<br />');
    }
  }
  return parts.join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}