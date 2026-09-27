import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../utils/apiClient';
import type { Conversation } from '../../types';

export default function ConversationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient.get<Conversation[]>('/conversations').then(setConversations).catch(() => setConversations([]));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <h1>Mensagens</h1>
      {conversations.length === 0 && <p style={{ color: '#8b8b96' }}>Ainda não tem conversas.</p>}
      {conversations.map((conv) => {
        const other = conv.participants.find((p) => p.userId !== user.id);
        const last = conv.messages?.[0];
        return (
          <button
            key={conv.id}
            onClick={() => router.push(`/messages/${conv.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              padding: 12,
              marginBottom: 8,
              borderRadius: 12,
              border: '1px solid #232330',
              background: '#16161d',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2a2a35', flexShrink: 0 }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600 }}>{other?.userId.slice(0, 8) ?? 'Utilizador'}</div>
              <div style={{ fontSize: 13, color: '#8b8b96', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {last?.content ?? (last?.mediaUrl ? '📎 anexo' : 'Sem mensagens ainda')}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
