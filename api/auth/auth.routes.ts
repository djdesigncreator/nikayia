import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { BubbleService } from '../../services/BubbleService';
import { ok, fail } from '../../utils/response';

export const authRouter = Router();

interface BubbleAuthResponse {
  response: { jwt: string; user_id: string };
}

/**
 * Depois do signup/login, garante que o registo User no Bubble tem os
 * campos extra que a rede social precisa (o Bubble só cria email/password
 * sozinho; o resto é nosso). Só define isPrivate/role/status se ainda não
 * existirem, para não apagar alterações feitas depois (ex.: um ADMIN
 * promovido à mão).
 */
async function ensureProfileFields(userId: string) {
  const user = await BubbleService.get<{ role?: string; status?: string; username?: string }>('User', userId);
  const patch: Record<string, unknown> = {};
  if (!user?.role) patch.role = 'USER';
  if (!user?.status) patch.status = 'ACTIVE';
  if (!user?.username) patch.username = `user_${userId.slice(-6)}`;
  if (Object.keys(patch).length > 0) await BubbleService.update('User', userId, patch);
}

/** POST /api/auth/signup — body: { email, password } */
authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return fail(res, 'VALIDATION_ERROR', 'email e password são obrigatórios.');

  try {
    const { data } = await axios.post<BubbleAuthResponse>(`${process.env.BUBBLE_API_BASE_URL}/signup`, {
      email,
      password,
    });
    await ensureProfileFields(data.response.user_id);
    return ok(res, { token: data.response.jwt }, 201);
  } catch {
    return fail(res, 'BUBBLE_ERROR', 'Não foi possível criar a conta. Verifique os dados e tente novamente.', 400);
  }
});

/** POST /api/auth/login — body: { email, password } */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return fail(res, 'VALIDATION_ERROR', 'email e password são obrigatórios.');

  try {
    const { data } = await axios.post<BubbleAuthResponse>(`${process.env.BUBBLE_API_BASE_URL}/login`, {
      email,
      password,
    });
    await ensureProfileFields(data.response.user_id);
    return ok(res, { token: data.response.jwt });
  } catch {
    return fail(res, 'UNAUTHORIZED', 'Email ou password incorretos.', 401);
  }
});

authRouter.post('/verify', (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) return fail(res, 'VALIDATION_ERROR', 'Token em falta.');

  const secret = process.env.BUBBLE_JWT_SECRET;
  if (!secret) return fail(res, 'INTERNAL_ERROR', 'Configuração em falta.', 500);

  try {
    const payload = jwt.verify(token, secret);
    return ok(res, { valid: true, payload });
  } catch {
    return fail(res, 'UNAUTHORIZED', 'Token inválido ou expirado.', 401);
  }
});

authRouter.post('/refresh', (_req, res) => {
  return fail(res, 'NOT_IMPLEMENTED', 'Endpoint por implementar.', 501);
});
