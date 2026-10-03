import axios from 'axios';
import { env } from '../config/env';

const BASE_URL = 'https://mozpayment.co.mz/api/1.1/wf';

interface LoginResponse {
  response: { token: string };
}

interface PaymentResponse {
  cod: number; // 200 = sucesso, 409 = falha (ver ARCHITECTURE.md / mozpayment-rotativo-emola para o padrão)
  [key: string]: unknown;
}

// Cache do token em memória — válido por 1 ano, mas se o servidor reiniciar,
// faz login outra vez sozinho (ver getToken). Não é persistido em disco.
let cachedToken: { value: string; obtainedAt: number } | null = null;
const TOKEN_MAX_AGE_MS = 300 * 24 * 60 * 60 * 1000; // renova por segurança aos 300 dias, antes de completar 1 ano

async function login(): Promise<string> {
  const { data } = await axios.post<LoginResponse>(`${BASE_URL}/login`, {
    email: env.MOZPAYMENT_EMAIL,
    senha: env.MOZPAYMENT_PASSWORD,
  });
  cachedToken = { value: data.response.token, obtainedAt: Date.now() };
  return cachedToken.value;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.obtainedAt < TOKEN_MAX_AGE_MS) {
    return cachedToken.value;
  }
  return login();
}

export type PaymentMethod = 'mpesa' | 'emola';

/**
 * Cobra um valor ao número de telemóvel indicado (C2B). Devolve `true` em
 * caso de sucesso (cod 200). Em caso de token expirado/; inválido, tenta
 * uma vez mais com um novo login antes de desistir.
 */
export const MozPaymentService = {
  async charge(params: { paymentMethod: PaymentMethod; amount: number; phoneNumber: string; payerName: string }): Promise<boolean> {
    const attempt = async (token: string) =>
      axios.post<PaymentResponse>(
        `${BASE_URL}/payment`,
        {
          wallet: env.MOZPAYMENT_WALLET,
          payment_method: params.paymentMethod,
          amount: String(params.amount),
          number: params.phoneNumber,
          name: params.payerName,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

    let token = await getToken();
    try {
      const { data } = await attempt(token);
      return data.cod === 200;
    } catch (err) {
      // Token pode ter expirado/sido revogado — tenta uma vez com login novo.
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        token = await login();
        const { data } = await attempt(token);
        return data.cod === 200;
      }
      throw err;
    }
  },
};
