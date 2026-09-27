import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { ok, fail } from '../../utils/response';

export const hashtagsRouter = Router();
const prisma = new PrismaClient();

/** GET /api/hashtags/trending — hashtags mais usadas. Tem de vir antes de /:tag. */
hashtagsRouter.get('/trending', requireAuth, async (_req, res) => {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { usageCount: 'desc' },
    take: 20,
  });
  return ok(res, hashtags);
});

/** GET /api/hashtags/:tag — publicações e reels com essa hashtag. */
hashtagsRouter.get('/:tag', requireAuth, async (req, res) => {
  const tag = req.params.tag.replace(/^#/, '').toLowerCase();
  const hashtag = await prisma.hashtag.findUnique({
    where: { tag },
    include: { posts: { include: { post: true }, orderBy: { post: { createdAt: 'desc' } }, take: 30 } },
  });

  if (!hashtag) return fail(res, 'NOT_FOUND', 'Hashtag não encontrada.', 404);

  return ok(res, { tag: hashtag.tag, usageCount: hashtag.usageCount, posts: hashtag.posts.map((p) => p.post) });
});
