import axios from 'axios';

/**
 * Camada única de acesso à Data API do Bubble (diferente dos Backend
 * Workflows usados no login/signup — esta fala com os "Data Types" do
 * Bubble como se fossem uma base de dados normal).
 *
 * Requer, no .env:
 *   BUBBLE_DATA_API_BASE_URL = https://SEU-APP.bubbleapps.io/version-test/api/1.1/obj
 *   BUBBLE_API_TOKEN         = o token gerado em Settings → API → "API Token"
 *
 * Documentação oficial: https://manual.bubble.io/core-resources/api/data-api
 */
function client() {
  return axios.create({
    baseURL: process.env.BUBBLE_DATA_API_BASE_URL,
    headers: { Authorization: `Bearer ${process.env.BUBBLE_API_TOKEN}` },
  });
}

export interface BubbleListOptions {
  constraints?: Array<{ key: string; constraint_type: string; value?: unknown }>;
  cursor?: number;
  limit?: number;
  sortField?: string;
  descending?: boolean;
}

export const BubbleService = {
  /** Cria um registo de um Data Type. Devolve o id do novo registo. */
  async create<T extends Record<string, unknown>>(type: string, data: T): Promise<string> {
    const { data: res } = await client().post(`/${type}`, data);
    return res.id as string;
  },

  /** Busca um registo pelo id. Devolve null se não existir. */
  async get<T = Record<string, unknown>>(type: string, id: string): Promise<T | null> {
    try {
      const { data } = await client().get(`/${type}/${id}`);
      return data.response as T;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  },

  /** Lista registos com filtros opcionais (constraints no formato da Data API do Bubble). */
  async list<T = Record<string, unknown>>(
    type: string,
    opts: BubbleListOptions = {},
  ): Promise<{ items: T[]; count: number; remaining: number }> {
    const params: Record<string, string> = {};
    if (opts.constraints) params.constraints = JSON.stringify(opts.constraints);
    if (opts.cursor !== undefined) params.cursor = String(opts.cursor);
    if (opts.limit !== undefined) params.limit = String(opts.limit);
    if (opts.sortField) params.sort_field = opts.sortField;
    if (opts.descending !== undefined) params.descending = String(opts.descending);

    const { data } = await client().get(`/${type}`, { params });
    return { items: data.response.results as T[], count: data.response.count, remaining: data.response.remaining };
  },

  async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    await client().patch(`/${type}/${id}`, data);
  },

  async delete(type: string, id: string): Promise<void> {
    await client().delete(`/${type}/${id}`);
  },
};
