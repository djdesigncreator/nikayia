import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../utils/apiClient';
import { PostCard } from '../components/PostCard';
import type { Post, PaginatedResult } from '../types';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get<PaginatedResult<Post>>('/posts')
      .then((data) => {
        setPosts(data.items);
        setNextCursor(data.next_cursor);
      })
      .finally(() => setLoadingFeed(false));
  }, [user]);

  async function loadMore() {
    if (!nextCursor) return;
    const data = await apiClient.get<PaginatedResult<Post>>(`/posts?cursor=${encodeURIComponent(nextCursor)}`);
    setPosts((prev) => [...prev, ...data.items]);
    setNextCursor(data.next_cursor);
  }

  if (loading || !user) return <p style={{ textAlign: 'center', marginTop: '20vh' }}>A carregar...</p>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>Nikayia</h1>
      {loadingFeed && <p>A carregar publicações...</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {nextCursor && (
        <button onClick={loadMore} style={{ width: '100%', padding: 12 }}>
          Carregar mais
        </button>
      )}
      {!loadingFeed && posts.length === 0 && <p>Ainda não há publicações no feed.</p>}
    </div>
  );
}
