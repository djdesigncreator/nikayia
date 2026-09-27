import { useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';

interface ExploreItem {
  kind: 'post' | 'reel';
  id: string;
  thumbnailUrl?: string;
  media?: { mediaUrl: string }[];
}

interface PaginatedExplore {
  items: ExploreItem[];
  next_cursor: string | null;
}

export default function ExplorePage() {
  const [items, setItems] = useState<ExploreItem[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedExplore>('/explore').then((data) => setItems(data.items));
  }, []);

  return (
    <div style={{ background: '#0b0b0f', minHeight: '100vh', padding: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {items.map((item) => (
          <div
            key={`${item.kind}-${item.id}`}
            style={{
              aspectRatio: '1/1',
              background: 'linear-gradient(160deg, #232330, #14141c)',
              position: 'relative',
            }}
          >
            {item.kind === 'reel' && (
              <span style={{ position: 'absolute', top: 6, right: 6, color: '#fff', fontSize: 14 }}>▶️</span>
            )}
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p style={{ color: '#8b8b96', textAlign: 'center', marginTop: 40 }}>Ainda não há conteúdo para explorar.</p>
      )}
    </div>
  );
}
