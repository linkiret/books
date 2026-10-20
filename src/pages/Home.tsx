import { useState } from 'react';
import { search as searchRanobeLib } from '../lib/ranobelib';
import { search as searchFlibusta } from '../lib/flibusta';
import { downloadToFile, downloadPdf, addToLibrary, writeBlobToData } from '../lib/storage';
import { openPdfExternal } from '../lib/opener';
import BookCard from '../components/BookCard';

export default function Home() {
  const [source, setSource] = useState<'ranobelib' | 'flibusta'>('flibusta');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const data = source === 'ranobelib' ? await searchRanobeLib(query) : await searchFlibusta(query);
      setResults(data);
      if (data.length === 0) alert('Ничего не найдено.');
    } catch (e) {
      alert('Ошибка поиска: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (book: any) => {
    if (source === 'flibusta') {
      const fmt = book.formats.epub
        ? { url: book.formats.epub, ext: 'epub' as const }
        : book.formats.fb2
        ? { url: book.formats.fb2, ext: 'fb2' as const }
        : book.formats.pdf
        ? { url: book.formats.pdf, ext: 'pdf' as const }
        : null;

      if (!fmt) {
        alert('У этой книги нет EPUB/FB2/PDF.');
        return;
      }

      const fileName = `${book.id}.${fmt.ext}`;

      if (fmt.ext === 'pdf') {
        const rel = await downloadPdf(fmt.url, fileName);
        await addToLibrary({
          id: book.id,
          title: book.title,
          author: book.author,
          source: 'flibusta',
          format: 'pdf',
          filePath: rel,
          cover: book.cover,
          addedAt: Date.now(),
        });
        try {
          await openPdfExternal(rel);
        } catch {
          alert('PDF в библиотеке, но открыть его не удалось. Проверь, есть ли на телефоне приложение для PDF.');
        }
      } else {
        const path = await downloadToFile(fmt.url, fileName);
        await addToLibrary({
          id: book.id,
          title: book.title,
          author: book.author,
          source: 'flibusta',
          format: fmt.ext,
          filePath: path,
          cover: book.cover,
          addedAt: Date.now(),
        });
      }
    } else {
      // RanobeLib: собираем EPUB из всех глав и кладём в библиотеку.
      const { getChapters, getChapterContent } = await import('../lib/ranobelib');
      const { buildEpub } = await import('../lib/epub-builder');

      const slug = book.slug_url;
      const chapters = await getChapters(slug);
      if (!chapters.length) {
        alert('У этого произведения нет глав.');
        return;
      }

      const collected: { title: string; html: string }[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const html = await getChapterContent(slug, ch.volume, ch.number);
        collected.push({
          title: ch.name || `Глава ${ch.number} (том ${ch.volume})`,
          html,
        });
      }

      const blob = await buildEpub({
        title: book.rus_name || book.name,
        author: '',
        chapters: collected,
      });

      const fileName = `ranobelib_${book.id}.epub`;
      const path = await writeBlobToData(blob, fileName);

      await addToLibrary({
        id: `rl_${book.id}`,
        title: book.rus_name || book.name,
        author: '',
        source: 'ranobelib',
        format: 'epub',
        filePath: path,
        cover: book.cover?.default,
        addedAt: Date.now(),
      });
    }
  };

  return (
    <div className="page">
      <h1 style={{ marginBottom: 16 }}>Поиск книг</h1>
      <div style={{ display: 'flex', gap: 8, margin: '0 0 12px' }}>
        <button
          onClick={() => { setSource('flibusta'); setResults([]); }}
          style={{ flex: 1, padding: 10, borderRadius: 6, background: source === 'flibusta' ? '#4d6bfe' : '#e5e5e5', color: source === 'flibusta' ? '#fff' : '#000' }}
        >
          Flibusta
        </button>
        <button
          onClick={() => { setSource('ranobelib'); setResults([]); }}
          style={{ flex: 1, padding: 10, borderRadius: 6, background: source === 'ranobelib' ? '#4d6bfe' : '#e5e5e5', color: source === 'ranobelib' ? '#fff' : '#000' }}
        >
          RanobeLib
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название или автор"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '0 16px', background: '#4d6bfe', color: '#fff', borderRadius: 8, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '...' : 'Искать'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {results.map((book) => (
          <BookCard key={book.id || book.slug_url} book={book} onDownload={handleDownload} />
        ))}
      </div>
    </div>
  );
}
