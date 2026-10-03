import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../../utils/apiClient';

type Method = 'mpesa' | 'emola' | 'visa';

interface SubscribeResponse {
  status: 'PENDING';
  embedUrl?: string;
  paymentId?: string;
}

export default function SubscribePage() {
  const router = useRouter();
  const { creatorId } = router.query;
  const [method, setMethod] = useState<Method>('mpesa');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  function pollStatus() {
    if (typeof creatorId !== 'string') return;
    pollRef.current = setInterval(async () => {
      const { active } = await apiClient.get<{ active: boolean }>(`/creators/${creatorId}/subscription-status`);
      if (active) {
        setConfirmed(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 4000);
  }

  async function submit() {
    if (typeof creatorId !== 'string' || !name.trim()) return;
    if (method !== 'visa' && !phone.trim()) {
      setError('Indique o número de telemóvel.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await apiClient.post<SubscribeResponse>(`/creators/${creatorId}/subscribe`, {
        paymentMethod: method,
        phoneNumber: method !== 'visa' ? phone.trim() : undefined,
        payerName: name.trim(),
      });

      if (data.embedUrl) setEmbedUrl(data.embedUrl);
      pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <Centered>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p>Subscrição ativa! Já tem acesso ao conteúdo premium.</p>
        <button onClick={() => router.push('/')} style={primaryBtn}>
          Ir para o feed
        </button>
      </Centered>
    );
  }

  if (embedUrl) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0f', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, color: '#fff', fontSize: 14 }}>
          A aguardar confirmação do pagamento por cartão...
        </div>
        <iframe src={embedUrl} style={{ flex: 1, border: 'none' }} title="Pagamento" />
      </div>
    );
  }

  return (
    <Centered>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Subscrever comunidade premium</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['mpesa', 'emola', 'visa'] as Method[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: method === m ? '2px solid #ff4d6d' : '1px solid #232330',
              background: '#16161d',
              color: '#fff',
              textTransform: 'uppercase',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {m === 'visa' ? 'Visa/Mastercard' : m}
          </button>
        ))}
      </div>

      <input placeholder="O seu nome" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      {method !== 'visa' && (
        <input
          placeholder="Número de telemóvel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ ...inputStyle, marginTop: 10 }}
        />
      )}

      {error && <p style={{ color: '#ff4d6d', fontSize: 13, marginTop: 10 }}>{error}</p>}

      <button onClick={submit} disabled={loading} style={{ ...primaryBtn, marginTop: 16, width: '100%' }}>
        {loading ? 'A iniciar...' : 'Pagar e subscrever'}
      </button>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0b0f',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #232330',
  background: '#16161d',
  color: '#fff',
};

const primaryBtn: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(90deg, #ff4d6d, #ff8a3c)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};
