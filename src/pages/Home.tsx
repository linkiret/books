import { useEffect, useState } from 'react';
import {
  search as searchRanobeLib,
  getCatalog,
  getGenres,
  RanobeLibGenre,
} from '../lib/ranobelib';
import { search as searchFlibusta } from '../lib/flibusta';
import { downloadToFile, downloadPdf, addToLibrary, writeBlobToData } from '../lib/storage';
import { openPdfExternal } from '../lib/opener';
import BookCard from '../components/BookCard';

type Mode = 'search' | 'catalog';

export default function Home() {
  const [source, setSource] = useState<'ranobelib' | 'flibusta'>('flibusta');
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Каталог RanobeLib
  const [genres, setGenres] = useState<RanobeLibGenre[]>([]);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('views');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    if (source === 'ranobelib' && mode === 'catalog' && genres.length === 0) {
      getGenres()
        .then(setGenres)
        .catch(() => setGenres([]));
    }
  }, [source, mode, genres.length]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const data =
        source === 'ranobelib' ? await searchRanobeLib(query) : await searchFlibusta(query);
      setResults(data);
      if (data.length === 0) alert('Ничего не найдено.');
    } catch (e) {
      alert('Ошибка поиска: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCatalog = async (nextPage = 1) => {
    setLoading(true);
    try {
      const { items, lastPage: lp } = await getCatalog({
        page: nextPage,
        genreId,
        sortBy,
      });
      setResults(items);
      setPage(nextPage);
      setLastPage(lp);
    } catch (e) {
      alert('Ошибка каталога: ' + (e as Error).message);
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
          alert('PDF в библиотеке, но открыть его не удалось. Проверь, есть ли приложение для PDF.');
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
      <h1 style={{ marginBottom: 16 }}>Книги</h1>

      <div style={{ display: 'flex', gap: 8, margin: '0 0 12px' }}>
        <button
          onClick={() => { setSource('flibusta'); setResults([]); setMode('search'); }}
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

      {source === 'ranobelib' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => { setMode('search'); setResults([]); }}
            style={{ flex: 1, padding: 8, borderRadius: 6, background: mode === 'search' ? '#4d6bfe' : '#e5e5e5', color: mode === 'search' ? '#fff' : '#000' }}
          >
            Поиск
          </button>
          <button
            onClick={() => { setMode('catalog'); setResults([]); }}
            style={{ flex: 1, padding: 8, borderRadius: 6, background: mode === 'catalog' ? '#4d6bfe' : '#e5e5e5', color: mode === 'catalog' ? '#fff' : '#000' }}
          >
            Каталог
          </button>
        </div>
      )}

      {mode === 'search' ? (
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <select
            value={genreId ?? ''}
            onChange={(e) => setGenreId(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e5e5' }}
          >
            <option value="">Все жанры</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.rus_name || g.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e5e5' }}
          >
            <option value="views">По популярности</option>
            <option value="rate_avg">По рейтингу</option>
            <option value="created_at">Новинки</option>
            <option value="name">По алфавиту</option>
          </select>
          <button
            onClick={() => handleCatalog(1)}
            disabled={loading}
            style={{ padding: 10, background: '#4d6bfe', color: '#fff', borderRadius: 6, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Загружаю...' : 'Показать'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {results.map((book) => (
          <BookCard key={book.id || book.slug_url} book={book} onDownload={handleDownload} />
        ))}
      </div>

      {mode === 'catalog' && results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => handleCatalog(page - 1)}
            style={{ padding: '8px 16px', borderRadius: 6, background: page <= 1 ? '#e5e5e5' : '#4d6bfe', color: page <= 1 ? '#999' : '#fff' }}
          >
            Назад
          </button>
          <span style={{ alignSelf: 'center', fontSize: 14, color: '#666' }}>{page} / {lastPage}</span>
          <button
            disabled={page >= lastPage || loading}
            onClick={() => handleCatalog(page + 1)}
            style={{ padding: '8px 16px', borderRadius: 6, background: page >= lastPage ? '#e5e5e5' : '#4d6bfe', color: page >= lastPage ? '#999' : '#fff' }}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}