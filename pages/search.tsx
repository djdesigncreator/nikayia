import { useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';

interface SearchResult {
  users: { id: string; username: string }[];
  hashtags: { tag: string; usageCount: number }[];
  posts: { id: string; caption?: string }[];
  reels: { id: string; caption?: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    // Debounce de 300ms — só pesquisa depois do utilizador parar de escrever.
    const timeout = setTimeout(() => {
      apiClient.get<SearchResult>(`/search?q=${encodeURIComponent(query)}`).then(setResults).catch(() => setResults(null));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar utilizadores, #hashtags, publicações..."
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 10,
          border: '1px solid #232330',
          background: '#16161d',
          color: '#fff',
          marginBottom: 20,
        }}
      />

      {results && (
        <>
          {results.users.length > 0 && (
            <Section title="Utilizadores">
              {results.users.map((u) => (
                <div key={u.id} style={rowStyle}>@{u.username}</div>
              ))}
            </Section>
          )}
          {results.hashtags.length > 0 && (
            <Section title="Hashtags">
              {results.hashtags.map((h) => (
                <div key={h.tag} style={rowStyle}>#{h.tag} · {h.usageCount} publicações</div>
              ))}
            </Section>
          )}
          {results.posts.length > 0 && (
            <Section title="Publicações">
              {results.posts.map((p) => (
                <div key={p.id} style={rowStyle}>{p.caption ?? '(sem legenda)'}</div>
              ))}
            </Section>
          )}
          {results.reels.length > 0 && (
            <Section title="Reels">
              {results.reels.map((r) => (
                <div key={r.id} style={rowStyle}>{r.caption ?? '(sem legenda)'}</div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: '#8b8b96', marginBottom: 8, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  );
}

const rowStyle: React.CSSProperties = { padding: '10px 0', borderBottom: '1px solid #1c1c26', fontSize: 14 };
