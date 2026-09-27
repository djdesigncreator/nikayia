import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../utils/apiClient';
import { ReelItem } from '../../components/ReelItem';
import type { Reel, PaginatedResult } from '../../types';

export default function ReelsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient.get<PaginatedResult<Reel>>('/reels').then((data) => {
      setReels(data.items);
      setNextCursor(data.next_cursor);
    });
  }, [user]);

  async function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - window.innerHeight;
    if (nearEnd && nextCursor) {
      const data = await apiClient.get<PaginatedResult<Reel>>(`/reels?cursor=${encodeURIComponent(nextCursor)}`);
      setReels((prev) => [...prev, ...data.items]);
      setNextCursor(data.next_cursor);
    }
  }

  if (loading || !user) return null;

  return (
    <div
      onScroll={handleScroll}
      style={{
        height: '100vh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: '#000',
      }}
    >
      {reels.map((reel) => (
        <ReelItem key={reel.id} reel={reel} />
      ))}
      {reels.length === 0 && (
        <p style={{ color: '#fff', textAlign: 'center', marginTop: '40vh' }}>Ainda não há reels.</p>
      )}
    </div>
  );
}
