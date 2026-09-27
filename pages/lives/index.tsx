import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../../utils/apiClient';
import type { Live } from '../../types';

export default function LivesListPage() {
  const router = useRouter();
  const [lives, setLives] = useState<Live[]>([]);

  useEffect(() => {
    apiClient.get<Live[]>('/lives/active').then(setLives).catch(() => setLives([]));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <h1>Lives agora</h1>
      {lives.length === 0 && <p style={{ color: '#8b8b96' }}>Ninguém em direto neste momento.</p>}
      {lives.map((live) => (
        <button
          key={live.id}
          onClick={() => router.push(`/lives/${live.id}`)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: 16,
            marginBottom: 12,
            borderRadius: 12,
            border: '1px solid #232330',
            background: '#16161d',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ background: '#ff4d6d', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>AO VIVO</span>
            <span style={{ fontSize: 12, color: '#8b8b96' }}>{live.viewersCount} a assistir</span>
          </div>
          <div style={{ fontWeight: 600 }}>{live.title}</div>
        </button>
      ))}
    </div>
  );
}
