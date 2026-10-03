import type { Post } from '../types';

export function PostCard({ post }: { post: Post & { locked?: boolean; is_premium?: boolean } }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13 }}>
        <span>{post.authorId}</span>
        <span>{new Date(post.createdAt).toLocaleString('pt-PT')}</span>
      </div>

      {post.locked && (
        <div
          style={{
            margin: '12px 0',
            padding: 20,
            textAlign: 'center',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #16161d, #0b0b0f)',
            border: '1px dashed #ff8a3c',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>🔒</div>
          <div style={{ fontSize: 13, color: '#8b8b96' }}>Conteúdo exclusivo da comunidade premium</div>
        </div>
      )}

      {post.caption && <p style={{ marginTop: 8 }}>{post.caption}</p>}
      <div style={{ display: 'flex', gap: 24, marginTop: 12, color: '#666', fontSize: 14 }}>
        <span>❤️ {post.likesCount}</span>
        <span>💬 {post.commentsCount}</span>
        <span>↗ {post.sharesCount}</span>
      </div>
    </div>
  );
}
