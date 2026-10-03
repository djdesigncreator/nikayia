import axios from 'axios';
import { env } from '../config/env';

const BASE_URL = 'https://mozpayment.co.mz/api/1.1/wf';

interface LoginResponse {
  response: { token: string };
}

let cachedToken: { value: string; obtainedAt: number } | null = null;
const TOKEN_MAX_AGE_MS = 300 * 24 * 60 * 60 * 1000; // renova aos 300 dias, antes de completar o 1 ano de validade

async function login(): Promise<string> {
  const { data } = await axios.post<LoginResponse>(`${BASE_URL}/login`, {
    email: env.MOZPAYMENT_EMAIL,
    senha: env.MOZPAYMENT_PASSWORD,
  });
  cachedToken = { value: data.response.token, obtainedAt: Date.now() };
  return cachedToken.value;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.obtainedAt < TOKEN_MAX_AGE_MS) return cachedToken.value;
  return login();
}

async function authedPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const attempt = (token: string) =>
    axios.post<T>(`${BASE_URL}/${path}`, body, { headers: { Authorization: `Bearer ${token}` } });

  let token = await getToken();
  try {
    const { data } = await attempt(token);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
      token = await login();
      const { data } = await attempt(token);
      return data;
    }
    throw err;
  }
}

export type MobilePaymentMethod = 'mpesa' | 'emola';

interface MobilePaymentResponse {
  idpayment: string;
  [key: string]: unknown;
}

interface BankPaymentResponse {
  url: string;
  session_id: string;
  [key: string]: unknown;
}

export const MozPaymentService = {
  /**
   * Inicia uma cobrança M-Pesa/eMola. NÃO confirma o pagamento — isso só
   * acontece quando o mozpayment.co.mz chamar o nosso webhook. Devolve o
   * `idpayment`, que é a referência a guardar para cruzar com o webhook
   * (campo `reason`).
   */
  async chargeMobile(params: { paymentMethod: MobilePaymentMethod; amount: number; phoneNumber: string; payerName: string }) {
    return authedPost<MobilePaymentResponse>('payment', {
      wallet: env.MOZPAYMENT_WALLET,
      payment_method: params.paymentMethod,
      amount: String(params.amount),
      number: params.phoneNumber,
      name: params.payerName,
    });
  },

  /**
   * Inicia uma cobrança por cartão (Visa/Mastercard). Devolve a `url` da
   * página de pagamento (para o frontend embutir num iframe) e o
   * `session_id` — guardar como referência para cruzar com o webhook
   * (campo `reason`).
   */
  async chargeCard(params: { amount: number; payerName: string; productName: string }) {
    return authedPost<BankPaymentResponse>('bankpayment', {
      valor: String(params.amount),
      nome_cliente: params.payerName,
      carteira: env.MOZPAYMENT_WALLET,
      nome_producto: params.productName,
    });
  },
};
