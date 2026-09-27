import { useEffect, useState } from 'react';
import { apiClient } from '../../utils/apiClient';

interface Report {
  id: string;
  targetType: 'POST' | 'COMMENT' | 'USER' | 'LIVE';
  targetId: string;
  category: string;
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
  createdAt: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  async function load() {
    const data = await apiClient.get<Report[]>('/reports?status=PENDING');
    setReports(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, status: Report['status']) {
    await apiClient.patch(`/reports/${id}`, { status });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, background: '#0b0b0f', minHeight: '100vh', color: '#fff' }}>
      <h1>Denúncias pendentes</h1>
      {reports.length === 0 && <p style={{ color: '#8b8b96' }}>Fila vazia — bom trabalho.</p>}
      {reports.map((r) => (
        <div key={r.id} style={{ padding: 16, borderRadius: 12, background: '#16161d', border: '1px solid #232330', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b8b96' }}>
            <span>{r.targetType} · {r.category}</span>
            <span>{new Date(r.createdAt).toLocaleString('pt-PT')}</span>
          </div>
          {r.description && <p style={{ marginTop: 8 }}>{r.description}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => resolve(r.id, 'ACTIONED')} style={btn('#ff4d6d')}>Remover conteúdo</button>
            <button onClick={() => resolve(r.id, 'DISMISSED')} style={btn('#232330')}>Ignorar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { padding: '8px 14px', borderRadius: 8, background: bg, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 };
}
