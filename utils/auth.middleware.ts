import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export type Role = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Valida o token JWT emitido pelo Bubble no momento do login.
 * Assume um segredo partilhado (BUBBLE_JWT_SECRET). Se o Bubble usar
 * assinatura assimétrica com JWKS, substituir por jwks-rsa aqui.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token em falta.');
  }

  const token = header.slice('Bearer '.length);
  const secret = process.env.BUBBLE_JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'BUBBLE_JWT_SECRET não configurado.');
  }

  try {
    const payload = jwt.verify(token, secret) as { user_id: string; role: Role };
    req.user = { id: payload.user_id, role: payload.role };
    next();
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token inválido ou expirado.');
  }
}

/** Restringe uma rota a um conjunto de roles. Usar depois de requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Sem permissão para esta ação.');
    }
    next();
  };
}
