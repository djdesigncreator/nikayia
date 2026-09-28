import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { BubbleService } from '../services/BubbleService';
import { ApiError } from './errorHandler';

export type Role = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthenticatedUser {
  id: string; // unique id do registo User no Bubble
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

function bubbleIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { data?: unknown; user_id?: unknown };
  if (typeof p.data === 'string') return p.data;
  if (typeof p.user_id === 'string') return p.user_id;
  return null;
}

/**
 * Valida o JWT emitido pelo Bubble e busca o utilizador diretamente na
 * Data API do Bubble (que é agora a base de dados principal). O role e o
 * status vêm sempre desta consulta, nunca do token — assim, suspender ou
 * promover alguém no Bubble tem efeito imediato.
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

    const userId = bubbleIdFromPayload(payload);
    if (!userId) throw new ApiError(401, 'UNAUTHORIZED', 'Token inválido.');

    const user = await BubbleService.get<{ role?: Role; status?: string }>('User', userId);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Conta não encontrada. Volte a iniciar sessão.');
    if (user.status && user.status !== 'ACTIVE') throw new ApiError(403, 'FORBIDDEN', 'Conta suspensa ou banida.');

    req.user = { id: userId, role: (user.role as Role) ?? 'USER' };
    next();
  })().catch(next);
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Sem permissão para esta ação.');
    }
    next();
  };
}
