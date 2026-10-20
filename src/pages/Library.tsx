import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrary, removeFromLibrary, LibraryItem } from '../lib/storage';
import { openPdfExternal } from '../lib/opener';

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const navigate = useNavigate();

  const load = () => getLibrary().then(setItems);
  useEffect(() => { load(); }, []);

  const handleRemove = async (id: string) => {
    await removeFromLibrary(id);
    load();
  };

  const handleOpen = async (item: LibraryItem) => {
    if (item.format === 'pdf') {
      try {
        await openPdfExternal(item.filePath);
      } catch {
        alert('Не удалось открыть PDF. Возможно, файл удалён или нет приложения для PDF.');
      }
    } else {
      navigate(`/reader/${item.id}`);
    }
  };

  return (
    <div className="page">
      <h1 style={{ marginBottom: 16 }}>Моя библиотека</h1>
      {items.length === 0 && <p style={{ color: '#666' }}>Пока пусто. Найди книгу во вкладке «Поиск».</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #e5e5e5', borderRadius: 8 }}>
            {item.cover && <img src={item.cover} alt="" width={48} height={72} style={{ objectFit: 'cover', borderRadius: 4 }} />}
            <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => handleOpen(item)}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 14, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.author || '—'}
                {item.format === 'pdf' && <span style={{ marginLeft: 8, color: '#4d6bfe', fontSize: 12 }}>PDF · внешнее приложение</span>}
              </div>
            </div>
            <button onClick={() => handleRemove(item.id)} style={{ color: '#d00', fontSize: 14, flexShrink: 0 }}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
