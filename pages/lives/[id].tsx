import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../../utils/apiClient';
import type { Live } from '../../types';

interface LiveComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface JoinResponse {
  channelName: string;
  token: string;
  uid: number;
  appId: string;
}

export default function LiveRoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [message, setMessage] = useState('');
  const lastCommentAt = useRef<string | undefined>(undefined);

  // Entrar no canal Agora como espectador.
  useEffect(() => {
    if (typeof id !== 'string') return;
    let client: import('agora-rtc-sdk-ng').IAgoraRTCClient | null = null;

    (async () => {
      const liveData = await apiClient.get<Live>(`/lives/${id}`);
      setLive(liveData);

      const { channelName, token, uid, appId } = await apiClient.post<JoinResponse>(`/lives/${id}/join`);

      // Import dinâmico: o SDK do Agora usa APIs de browser e não corre no servidor (SSR).
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      await client.setClientRole('audience');
      await client.join(appId, channelName, token, uid);

      client.on('user-published', async (user, mediaType) => {
        await client!.subscribe(user, mediaType);
        if (mediaType === 'video' && videoContainerRef.current) {
          user.videoTrack?.play(videoContainerRef.current);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });
    })();

    return () => {
      client?.leave();
    };
  }, [id]);

  // Polling simples do chat a cada 3s. TODO: substituir por WebSocket/Agora RTM
  // quando o volume de espectadores justificar tempo real "verdadeiro".
  useEffect(() => {
    if (typeof id !== 'string') return;
    const interval = setInterval(async () => {
      const query = lastCommentAt.current ? `?after=${encodeURIComponent(lastCommentAt.current)}` : '';
      const newComments = await apiClient.get<LiveComment[]>(`/lives/${id}/comments${query}`);
      if (newComments.length > 0) {
        setComments((prev) => [...prev, ...newComments]);
        lastCommentAt.current = newComments[newComments.length - 1].createdAt;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  async function sendComment() {
    if (!message.trim() || typeof id !== 'string') return;
    await apiClient.post(`/lives/${id}/comments`, { content: message.trim() });
    setMessage('');
  }

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div ref={videoContainerRef} style={{ flex: 1, position: 'relative' }} />

      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff' }}>
        <span style={{ background: '#ff4d6d', fontSize: 11, padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>
          AO VIVO
        </span>
        {live?.title}
        <div style={{ fontSize: 12, color: '#ccc' }}>{live?.viewersCount} a assistir</div>
      </div>

      <div
        style={{
          height: '35%',
          background: '#0b0b0f',
          borderTop: '1px solid #232330',
          display: 'flex',
          flexDirection: 'column',
          padding: 12,
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', color: '#fff', fontSize: 13 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ marginBottom: 6 }}>
              <b>{c.userId.slice(0, 6)}:</b> {c.content}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendComment()}
            placeholder="Comentar..."
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #232330', background: '#16161d', color: '#fff' }}
          />
          <button onClick={sendComment} style={{ padding: '0 16px', borderRadius: 8, background: '#ff4d6d', color: '#fff', border: 'none' }}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
