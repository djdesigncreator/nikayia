import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../utils/apiClient';

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  totalPosts: number;
  totalReels: number;
  totalStories: number;
  activeLives: number;
  pendingReports: number;
  bannedUsers: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') return;
    apiClient.get<Stats>('/admin/stats').then(setStats);
  }, [user]);

  if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return <p style={{ color: '#fff', textAlign: 'center', marginTop: '20vh' }}>Sem acesso.</p>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <h1>Painel Administrativo</h1>
      {!stats && <p style={{ color: '#8b8b96' }}>A carregar estatísticas...</p>}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          <Card label="Utilizadores" value={stats.totalUsers} />
          <Card label="Novos hoje" value={stats.newUsersToday} />
          <Card label="Publicações" value={stats.totalPosts} />
          <Card label="Reels" value={stats.totalReels} />
          <Card label="Stories ativas" value={stats.totalStories} />
          <Card label="Lives agora" value={stats.activeLives} />
          <Card label="Denúncias pendentes" value={stats.pendingReports} highlight />
          <Card label="Utilizadores banidos" value={stats.bannedUsers} />
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <a href="/admin/reports" style={{ color: '#ff4d6d' }}>Ver fila de denúncias →</a>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: '#16161d', border: `1px solid ${highlight ? '#ff4d6d' : '#232330'}` }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#8b8b96' }}>{label}</div>
    </div>
  );
}
