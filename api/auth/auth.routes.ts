import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ok, fail } from '../../utils/response';

export const authRouter = Router();

/**
 * POST /api/auth/verify
 * Recebe o token emitido pelo Bubble após login/registo e confirma que é válido.
 * Útil para o frontend confirmar a sessão logo após o redirect do Bubble.
 */
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
 * TODO: implementar renovação de sessão junto do Bubble (ou emitir um
 * token de curta duração próprio do backend, assinado com BUBBLE_JWT_SECRET,
 * a decidir consoante o fluxo exato que o Bubble expuser).
 */
authRouter.post('/refresh', (_req, res) => {
  return fail(res, 'NOT_IMPLEMENTED', 'Endpoint por implementar.', 501);
});
