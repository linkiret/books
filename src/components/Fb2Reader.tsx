import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeFb2, parseFb2 } from '../lib/fb2';

interface Props {
  bytes: Uint8Array;
}

export default function Fb2Reader({ bytes }: Props) {
  const [parsed, setParsed] = useState<{ title: string; author: string; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const text = decodeFb2(bytes);
      const result = parseFb2(text);
      setParsed(result);
    } catch (e) {
      setError('FB2: ' + (e as Error).message);
    }
  }, [bytes]);

  // Сбрасываем скролл при загрузке новой книги
  useEffect(() => {
    if (parsed && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [parsed]);

  const html = useMemo(() => (parsed ? { __html: parsed.html } : null), [parsed]);

  if (error) return <div className="page"><p>{error}</p></div>;
  if (!parsed || !html) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        ref={contentRef}
        className="fb2-content"
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          setProgress(max > 0 ? el.scrollTop / max : 0);
        }}
        dangerouslySetInnerHTML={html}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e5e5e5', background: '#fff' }}>
        <span style={{ fontSize: 14, color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {parsed.author}
        </span>
        <span style={{ fontSize: 14, color: '#666', marginLeft: 12 }}>
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
