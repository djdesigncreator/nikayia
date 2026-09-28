import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { ok, fail } from '../../utils/response';

export const authRouter = Router();

/**
 * O frontend nunca fala diretamente com o Bubble. Ele chama estas rotas do
 * nosso backend, que por sua vez chama os Backend Workflows do Bubble
 * (server-to-server, sem problemas de CORS e sem expor a URL do Bubble
 * ao browser). O Bubble já devolve o JWT assinado (ver BUBBLE_SETUP.md).
 */


/**
 * Garante que existe um utilizador na NOSSA base de dados para esta conta do
 * Bubble. O Bubble guarda a identidade (email/password); nós guardamos tudo o
 * resto (perfil, posts, seguidores...), ligado pelo id do Bubble.
 */
async function syncUser(bubbleUserId: string, email: string) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
  return prisma.user.upsert({
    where: { bubbleUserId },
    update: {},
    create: { bubbleUserId, email: email.toLowerCase(), username: `${base}_${bubbleUserId.slice(-5)}` },
  });
}

interface BubbleAuthResponse {
  response: { jwt: string; user_id: string };
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
    await syncUser(data.response.user_id, email);
    return ok(res, { token: data.response.jwt }, 201);
  } catch (err) {
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
    await syncUser(data.response.user_id, email);
    return ok(res, { token: data.response.jwt });
  } catch (err) {
    return fail(res, 'UNAUTHORIZED', 'Email ou password incorretos.', 401);
  }
});

/** POST /api/auth/verify — confirma que um token ainda é válido. */
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

/**
 * POST /api/auth/refresh
 * TODO: implementar renovação — chamar um workflow "refresh" no Bubble que
 * confirme a sessão ainda ativa e assine um novo JWT, ou emitir localmente
 * um token de curta duração assinado com BUBBLE_JWT_SECRET.
 */
authRouter.post('/refresh', (_req, res) => {
  return fail(res, 'NOT_IMPLEMENTED', 'Endpoint por implementar.', 501);
});
