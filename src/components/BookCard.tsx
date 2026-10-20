import { useState } from 'react';

interface Props {
  book: any;
  onDownload: (book: any) => Promise<void>;
}

export default function BookCard({ book, onDownload }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onDownload(book);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const title = book.rus_name || book.title;
  const cover = book.cover?.default || book.cover;

  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fafafa' }}>
      {cover ? (
        <img src={cover} alt="" width={64} height={96} style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 64, height: 96, background: '#e5e5e5', borderRadius: 4, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {title}
        </strong>
        <span style={{ fontSize: 14, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.author || ''}
        </span>
        <button
          onClick={handleClick}
          disabled={loading || done}
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            background: done ? '#22a06b' : '#4d6bfe',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 14,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Скачиваю...' : done ? 'В библиотеке' : 'Скачать'}
        </button>
      </div>
    </div>
  );
}
