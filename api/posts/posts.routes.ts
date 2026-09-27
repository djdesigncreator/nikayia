import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { createNotification } from '../notifications/notifications.routes';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { ok, fail, paginated } from '../../utils/response';

export const postsRouter = Router();
const prisma = new PrismaClient();

postsRouter.post('/', requireAuth, async (req, res) => {
  const { type, caption, location, visibility, media } = req.body as {
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'LINK';
    caption?: string;
    location?: string;
    visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
    media?: { url: string; type: 'IMAGE' | 'VIDEO' }[];
  };

  if (!type) return fail(res, 'VALIDATION_ERROR', 'type é obrigatório.');

  const post = await prisma.post.create({
    data: {
      authorId: req.user!.id,
      type,
      caption,
      location,
      visibility: visibility ?? 'PUBLIC',
      media: media?.length
        ? { create: media.map((m, i) => ({ mediaUrl: m.url, mediaType: m.type, orderIndex: i })) }
        : undefined,
    },
    include: { media: true },
  });

  // TODO: extrair hashtags/menções de `caption` e criar Notification/PostHashtag correspondentes.

  return ok(res, post, 201);
});

postsRouter.get('/:id', requireAuth, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: { media: true } });
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);
  return ok(res, post);
});

postsRouter.delete('/:id', requireAuth, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);
  if (post.authorId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.post.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

postsRouter.post('/:id/like', requireAuth, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  await prisma.$transaction([
    prisma.like.upsert({
      where: { userId_postId: { userId: req.user!.id, postId: req.params.id } },
      update: {},
      create: { userId: req.user!.id, postId: req.params.id },
    }),
    prisma.post.update({ where: { id: req.params.id }, data: { likesCount: { increment: 1 } } }),
  ]);
  await createNotification({ recipientId: post.authorId, actorId: req.user!.id, type: 'LIKE', entityId: post.id });
  return ok(res, { liked: true });
});

postsRouter.delete('/:id/like', requireAuth, async (req, res) => {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId: req.params.id } },
  });
  if (!existing) return ok(res, { liked: false });

  await prisma.$transaction([
    prisma.like.delete({ where: { id: existing.id } }),
    prisma.post.update({ where: { id: req.params.id }, data: { likesCount: { decrement: 1 } } }),
  ]);
  return ok(res, { liked: false });
});

/** GET /api/feed?cursor=&limit= — feed cronológico simples (base para o algoritmo). */
postsRouter.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const cursor = decodeCursor(req.query.cursor as string | undefined);

  const posts = await prisma.post.findMany({
    where: cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: { media: true },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items, nextCursor);
});

// TODO: /posts/:id/save, /posts/:id/share, /posts/:id/report — mesmo padrão,
// usando os modelos SavedPost, Share, Report.
