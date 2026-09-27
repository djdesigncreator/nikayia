import type { Post } from '../types';

export function PostCard({ post }: { post: Post }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13 }}>
        <span>{post.authorId}</span>
        <span>{new Date(post.createdAt).toLocaleString('pt-PT')}</span>
      </div>
      {post.caption && <p style={{ marginTop: 8 }}>{post.caption}</p>}
      <div style={{ display: 'flex', gap: 24, marginTop: 12, color: '#666', fontSize: 14 }}>
        <span>❤️ {post.likesCount}</span>
        <span>💬 {post.commentsCount}</span>
        <span>↗ {post.sharesCount}</span>
      </div>
    </div>
  );
}
