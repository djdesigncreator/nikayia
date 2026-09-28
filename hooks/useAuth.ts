// Hook de exemplo — adaptar ao Next.js quando o /frontend for inicializado.
// Guarda o token recebido do Bubble após login e anexa-o em todos os pedidos ao backend.

import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { apiClient } from '../utils/apiClient';

const TOKEN_KEY = 'nikayia_session_token';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      // apiClient já anexa o token guardado e fala com o backend (NEXT_PUBLIC_API_BASE_URL).
      const me = await apiClient.get<User>('/users/me');
      setUser(me);
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Em memória por padrão; usar armazenamento seguro (ex.: cookie httpOnly
    // definido pelo backend) em vez de localStorage para produção.
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  function login(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
    fetchMe();
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return { user, loading, login, logout };
}
