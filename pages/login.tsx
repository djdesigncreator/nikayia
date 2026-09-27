// Página de login. Não tem formulário próprio — a autenticação real
// (email/password, criar conta, recuperar password) acontece no Bubble,
// conforme definido na arquitetura. Esta página só redireciona para lá.

export default function LoginPage() {
  const bubbleLoginUrl = process.env.NEXT_PUBLIC_BUBBLE_LOGIN_URL ?? 'https://SEU-APP.bubbleapps.io/login';
  const redirectBack = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '';

  const fullUrl = `${bubbleLoginUrl}?redirect_url=${encodeURIComponent(redirectBack)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20vh', gap: 16 }}>
      <h1>Entrar no Nikayia</h1>
      <p>Vai ser redirecionado para a página de login segura.</p>
      <a
        href={fullUrl}
        style={{ padding: '12px 24px', background: '#ff5a3c', color: '#fff', borderRadius: 8, textDecoration: 'none' }}
      >
        Continuar
      </a>
    </div>
  );
}
