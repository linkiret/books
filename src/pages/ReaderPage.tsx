import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLibrary, readBookBase64 } from '../lib/storage';
import EpubReader from '../components/EpubReader';
import Fb2Reader from '../components/Fb2Reader';

type Loaded =
  | { kind: 'epub'; data: ArrayBuffer }
  | { kind: 'fb2'; bytes: Uint8Array };

export default function ReaderPage() {
  const { id } = useParams();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const lib = await getLibrary();
        const item = lib.find((i) => i.id === id);
        if (!item) {
          setError('Книга не найдена в библиотеке.');
          return;
        }
        if (item.format === 'pdf') {
          setError('PDF открывается во внешнем приложении из библиотеки.');
          return;
        }

        const base64 = await readBookBase64(item.filePath);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        if (item.format === 'epub') {
          setLoaded({ kind: 'epub', data: bytes.buffer });
        } else {
          setLoaded({ kind: 'fb2', bytes });
        }
      } catch (e) {
        setError('Не удалось открыть книгу: ' + (e as Error).message);
      }
    })();
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <p style={{ marginBottom: 16 }}>{error}</p>
        <Link to="/library">← В библиотеку</Link>
      </div>
    );
  }

  if (!loaded) return <div className="page"><p>Загрузка...</p></div>;

  if (loaded.kind === 'epub') return <EpubReader data={loaded.data} />;
  return <Fb2Reader bytes={loaded.bytes} />;
}
