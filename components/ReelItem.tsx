import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../utils/apiClient';
import type { Reel } from '../types';

export function ReelItem({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const watchStart = useRef<number>(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
          watchStart.current = Date.now();
        } else {
          el.pause();
          if (watchStart.current) {
            const watchTimeMs = Date.now() - watchStart.current;
            apiClient.post(`/reels/${reel.id}/view`, { watchTimeMs }).catch(() => {});
            watchStart.current = 0;
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reel.id]);

  function toggleLike() {
    setLiked((v) => !v);
    apiClient.post(`/reels/${reel.id}/like`).catch(() => {});
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        scrollSnapAlign: 'start',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted((m) => !m)}
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      />

      <div style={{ position: 'absolute', left: 16, bottom: 24, color: '#fff', maxWidth: '75%' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>@{reel.authorId.slice(0, 8)}</div>
        {reel.caption && <div style={{ fontSize: 14 }}>{reel.caption}</div>}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          color: '#fff',
        }}
      >
        <button onClick={toggleLike} style={btnStyle}>
          {liked ? '❤️' : '🤍'}
          <span style={countStyle}>{reel.likesCount + (liked ? 1 : 0)}</span>
        </button>
        <button style={btnStyle}>
          💬
          <span style={countStyle}>{reel.commentsCount}</span>
        </button>
        <button style={btnStyle}>↗</button>
        <button style={btnStyle}>🔖</button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontSize: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  cursor: 'pointer',
};

const countStyle: React.CSSProperties = { fontSize: 11 };
