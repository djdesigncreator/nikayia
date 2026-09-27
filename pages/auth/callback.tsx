import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

/**
 * O Bubble, depois de um login/registo com sucesso, deve redirecionar para
 * esta página com o token JWT assinado como query param:
 *   https://<frontend>/auth/callback?token=<jwt>
 * Ver a secção "Configurar no Bubble" no README para o passo a passo
 * de como criar esse workflow.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    if (!router.isReady) return;
    const token = router.query.token as string | undefined;

    if (!token) {
      router.replace('/login?error=missing_token');
      return;
    }

    login(token);
    router.replace('/');
  }, [router, login]);

  return <p style={{ textAlign: 'center', marginTop: '20vh' }}>A entrar...</p>;
}
