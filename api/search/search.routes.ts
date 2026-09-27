import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { fail } from '../../utils/response';

export const searchRouter = Router();

/**
 * Rotas de 'search' - ver API_SPEC.md para a lista completa de endpoints
 * deste dominio e os respetivos contratos de request/response.
 * Seguir o padrao ja implementado em api/posts/posts.routes.ts e
 * api/users/users.routes.ts (Prisma + requireAuth + ok/fail/paginated).
 */
searchRouter.get('/', requireAuth, (_req, res) => {
  return fail(res, 'NOT_IMPLEMENTED', 'Endpoint de search por implementar.', 501);
});
