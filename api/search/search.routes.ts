import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { ok, fail } from '../../utils/response';

export const searchRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/search?q=&type=
 * type opcional: users | hashtags | posts | reels (omitido = pesquisa tudo)
 * O debounce (não disparar a cada tecla) fica do lado do frontend — ver
 * pages/search.tsx, que espera ~300ms de pausa antes de chamar esta rota.
 */
searchRouter.get('/', requireAuth, async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const type = req.query.type as string | undefined;
  if (!q) return fail(res, 'VALIDATION_ERROR', 'q é obrigatório.');

  const [users, hashtags, posts, reels] = await Promise.all([
    !type || type === 'users'
      ? prisma.user.findMany({
          where: { username: { contains: q, mode: 'insensitive' } },
          take: 10,
          include: { profile: true },
        })
      : [],
    !type || type === 'hashtags'
      ? prisma.hashtag.findMany({
          where: { tag: { contains: q.replace(/^#/, ''), mode: 'insensitive' } },
          orderBy: { usageCount: 'desc' },
          take: 10,
        })
      : [],
    !type || type === 'posts'
      ? prisma.post.findMany({
          where: { caption: { contains: q, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [],
    !type || type === 'reels'
      ? prisma.reel.findMany({
          where: { caption: { contains: q, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [],
  ]);

  return ok(res, { users, hashtags, posts, reels });
});
