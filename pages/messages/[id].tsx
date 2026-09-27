import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../utils/apiClient';
import type { Message, PaginatedResult } from '../../types';

export default function ConversationPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    if (typeof id !== 'string') return;
    const data = await apiClient.get<PaginatedResult<Message>>(`/conversations/${id}/messages`);
    setMessages(data.items);
  }

  useEffect(() => {
    loadMessages();
    // Polling simples a cada 3s. TODO: trocar por WebSocket quando existir
    // um servidor de tempo real dedicado a mensagens.
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!text.trim() || typeof id !== 'string') return;
    await apiClient.post(`/conversations/${id}/messages`, { content: text.trim() });
    setText('');
    loadMessages();
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0b0f', color: '#fff' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #232330' }}>
        <button onClick={() => router.push('/messages')} style={{ background: 'none', border: 'none', color: '#fff' }}>
          ← Voltar
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m) => {
          const isMine = m.senderId === user?.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: 14,
                  background: isMine ? '#ff4d6d' : '#16161d',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #232330' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escrever mensagem..."
          style={{ flex: 1, padding: 10, borderRadius: 20, border: '1px solid #232330', background: '#16161d', color: '#fff' }}
        />
        <button onClick={send} style={{ padding: '0 18px', borderRadius: 20, background: '#ff4d6d', color: '#fff', border: 'none' }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
