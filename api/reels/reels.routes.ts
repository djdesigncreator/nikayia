import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { ok, fail, paginated } from '../../utils/response';

export const reelsRouter = Router();
const prisma = new PrismaClient();

/**
 * POST /api/reels — criar um reel.
 * O upload do vídeo em si acontece antes, direto para o Bunny.net, via
 * POST /api/media/upload-url. Aqui só se regista o resultado desse upload.
 */
reelsRouter.post('/', requireAuth, async (req, res) => {
  const { videoUrl, thumbnailUrl, caption } = req.body as {
    videoUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
  };

  if (!videoUrl || !thumbnailUrl) {
    return fail(res, 'VALIDATION_ERROR', 'videoUrl e thumbnailUrl são obrigatórios.');
  }

  const reel = await prisma.reel.create({
    data: { authorId: req.user!.id, videoUrl, thumbnailUrl, caption },
  });

  return ok(res, reel, 201);
});

/** GET /api/reels?cursor=&limit= — feed vertical, mais recente primeiro. */
reelsRouter.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 10), 30);
  const cursor = decodeCursor(req.query.cursor as string | undefined);

  const reels = await prisma.reel.findMany({
    where: cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = reels.length > limit;
  const items = hasMore ? reels.slice(0, limit) : reels;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items, nextCursor);
});

reelsRouter.get('/:id', requireAuth, async (req, res) => {
  const reel = await prisma.reel.findUnique({ where: { id: req.params.id } });
  if (!reel) return fail(res, 'NOT_FOUND', 'Reel não encontrado.', 404);
  return ok(res, reel);
});

/** POST /api/reels/:id/view — regista visualização e tempo assistido (para o algoritmo). */
reelsRouter.post('/:id/view', requireAuth, async (req, res) => {
  const { watchTimeMs } = req.body as { watchTimeMs?: number };

  await prisma.$transaction([
    prisma.reelView.create({
      data: { reelId: req.params.id, viewerId: req.user!.id, watchTimeMs: watchTimeMs ?? 0 },
    }),
    prisma.reel.update({ where: { id: req.params.id }, data: { viewsCount: { increment: 1 } } }),
  ]);

  return ok(res, { recorded: true });
});

reelsRouter.post('/:id/like', requireAuth, async (req, res) => {
  await prisma.$transaction([
    prisma.like.upsert({
      where: { userId_reelId: { userId: req.user!.id, reelId: req.params.id } },
      update: {},
      create: { userId: req.user!.id, reelId: req.params.id },
    }),
    prisma.reel.update({ where: { id: req.params.id }, data: { likesCount: { increment: 1 } } }),
  ]);
  return ok(res, { liked: true });
});

reelsRouter.delete('/:id', requireAuth, async (req, res) => {
  const reel = await prisma.reel.findUnique({ where: { id: req.params.id } });
  if (!reel) return fail(res, 'NOT_FOUND', 'Reel não encontrado.', 404);
  if (reel.authorId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.reel.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});
