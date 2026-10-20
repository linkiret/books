import { useEffect, useRef, useState } from 'react';
import ePub, { Book } from 'epubjs';

interface Props {
  data: ArrayBuffer;
}

export default function EpubReader({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    try {
      const book = ePub(data);
      bookRef.current = book;

      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none',
      });
      renditionRef.current = rendition;

      rendition.display();

      book.ready.then(() => {
        if (!cancelled) setReady(true);
      });

      book.locations.generate(1000).then(() => {
        if (cancelled) return;
        rendition.on('relocated', (location: any) => {
          if (location?.start?.percentage != null) {
            setProgress(location.start.percentage);
          }
        });
      });
    } catch (e) {
      setError('EPUB: ' + (e as Error).message);
    }

    return () => {
      cancelled = true;
      try {
        renditionRef.current?.destroy();
        bookRef.current?.destroy();
      } catch {
        // игнорируем
      }
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [data]);

  const prev = () => renditionRef.current?.prev();
  const next = () => renditionRef.current?.next();

  if (error) return <div className="page"><p>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e5e5e5', background: '#fff' }}>
        <button onClick={prev} disabled={!ready} style={{ padding: '8px 16px', borderRadius: 6, background: ready ? '#4d6bfe' : '#e5e5e5', color: ready ? '#fff' : '#999' }}>
          Назад
        </button>
        <span style={{ fontSize: 14, color: '#666' }}>{Math.round(progress * 100)}%</span>
        <button onClick={next} disabled={!ready} style={{ padding: '8px 16px', borderRadius: 6, background: ready ? '#4d6bfe' : '#e5e5e5', color: ready ? '#fff' : '#999' }}>
          Вперёд
        </button>
      </div>
    </div>
  );
}
