import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Library from './pages/Library';
import ReaderPage from './pages/ReaderPage';

function Nav() {
  const loc = useLocation();
  const link = (to: string, label: string) => {
    const active = loc.pathname === to;
    return (
      <Link
        to={to}
        style={{
          color: active ? '#4d6bfe' : '#666',
          fontWeight: active ? 600 : 400,
          fontSize: 16,
        }}
      >
        {label}
      </Link>
    );
  };
  return (
    <nav style={{ display: 'flex', gap: 24, padding: '14px 16px', borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
      {link('/', 'Поиск')}
      {link('/library', 'Библиотека')}
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reader/:id" element={<ReaderPage />} />
      </Routes>
    </HashRouter>
  );
}
