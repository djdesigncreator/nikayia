import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { ApiError } from './errorHandler';

export type Role = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthenticatedUser {
  id: string; // id do utilizador na NOSSA base de dados (não o do Bubble)
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

/** Extrai o id do utilizador no Bubble do payload do JWT (plugin Encode JWT guarda-o em `data`). */
function bubbleIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { data?: unknown; user_id?: unknown };
  if (typeof p.data === 'string') return p.data;
  if (typeof p.user_id === 'string') return p.user_id;
  return null;
}

/**
 * Valida o JWT emitido pelo Bubble e carrega o utilizador da nossa BD.
 * O token só prova QUEM é o utilizador; o role vem sempre da nossa base de
 * dados, por isso mudar alguém para MODERATOR/ADMIN tem efeito imediato.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  (async () => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'UNAUTHORIZED', 'Token em falta.');

    const secret = process.env.BUBBLE_JWT_SECRET;
    if (!secret) throw new ApiError(500, 'INTERNAL_ERROR', 'BUBBLE_JWT_SECRET não configurado.');

    let payload: unknown;
    try {
      payload = jwt.verify(header.slice('Bearer '.length), secret);
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Token inválido ou expirado.');
    }

    const bubbleUserId = bubbleIdFromPayload(payload);
    if (!bubbleUserId) throw new ApiError(401, 'UNAUTHORIZED', 'Token inválido.');

    const user = await prisma.user.findUnique({ where: { bubbleUserId } });
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Conta não encontrada. Volte a iniciar sessão.');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'FORBIDDEN', 'Conta suspensa ou banida.');

    req.user = { id: user.id, role: user.role as Role };
    next();
  })().catch(next);
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
