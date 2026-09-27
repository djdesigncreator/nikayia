import { useEffect, useState } from 'react';
import { apiClient } from '../../utils/apiClient';
import type { Notification, PaginatedResult } from '../../types';

const LABELS: Record<Notification['type'], string> = {
  FOLLOW: 'começou a seguir-te',
  FOLLOW_REQUEST: 'pediu para te seguir',
  LIKE: 'gostou da tua publicação',
  COMMENT: 'comentou a tua publicação',
  REPLY: 'respondeu ao teu comentário',
  MENTION: 'mencionou-te',
  SHARE: 'partilhou a tua publicação',
  MESSAGE: 'enviou-te uma mensagem',
  LIVE_STARTED: 'começou uma live',
  LIVE_INVITE: 'convidou-te para uma live',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResult<Notification>>('/notifications').then((data) => setNotifications(data.items));
  }, []);

  async function markAllRead() {
    await apiClient.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Notificações</h1>
        <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#ff4d6d', cursor: 'pointer' }}>
          Marcar todas como lidas
        </button>
      </div>

      {notifications.length === 0 && <p style={{ color: '#8b8b96' }}>Sem notificações por agora.</p>}

      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 10,
            marginBottom: 6,
            background: n.isRead ? 'transparent' : '#16161d',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2a2a35', flexShrink: 0 }} />
          <div style={{ fontSize: 14 }}>
            <b>{n.actorId.slice(0, 8)}</b> {LABELS[n.type]}
            <div style={{ fontSize: 12, color: '#8b8b96' }}>{new Date(n.createdAt).toLocaleString('pt-PT')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
