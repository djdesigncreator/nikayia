import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../utils/auth.middleware';
import { createNotification } from '../notifications/notifications.routes';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { ok, fail, paginated } from '../../utils/response';

export const commentsRouter = Router();

/** GET /api/posts/:postId/comments?cursor= — listar comentários de um post. */
commentsRouter.get('/posts/:postId/comments', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const cursor = decodeCursor(req.query.cursor as string | undefined);

  const comments = await prisma.comment.findMany({
    where: {
      postId: req.params.postId,
      parentCommentId: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items, nextCursor);
});

/** POST /api/posts/:postId/comments — criar comentário ou resposta. */
commentsRouter.post('/posts/:postId/comments', requireAuth, async (req, res) => {
  const { content, parentCommentId } = req.body as { content?: string; parentCommentId?: string };
  if (!content?.trim()) return fail(res, 'VALIDATION_ERROR', 'content é obrigatório.');

  const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId: req.params.postId, authorId: req.user!.id, content: content.trim(), parentCommentId },
    }),
    prisma.post.update({ where: { id: req.params.postId }, data: { commentsCount: { increment: 1 } } }),
  ]);

  await createNotification({
    recipientId: post.authorId,
    actorId: req.user!.id,
    type: parentCommentId ? 'REPLY' : 'COMMENT',
    entityId: comment.id,
  });

  // TODO: extrair @menções do content e criar Notification tipo MENTION para cada uma.
  return ok(res, comment, 201);
});

/** DELETE /api/comments/:id — eliminar comentário próprio. */
commentsRouter.delete('/comments/:id', requireAuth, async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) return fail(res, 'NOT_FOUND', 'Comentário não encontrado.', 404);
  if (comment.authorId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.$transaction([
    prisma.comment.delete({ where: { id: req.params.id } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } }),
  ]);
  return ok(res, { deleted: true });
});

/** POST /api/comments/:id/like — gostar de um comentário. */
commentsRouter.post('/comments/:id/like', requireAuth, async (req, res) => {
  await prisma.$transaction([
    prisma.commentLike.upsert({
      where: { userId_commentId: { userId: req.user!.id, commentId: req.params.id } },
      update: {},
      create: { userId: req.user!.id, commentId: req.params.id },
    }),
    prisma.comment.update({ where: { id: req.params.id }, data: { likesCount: { increment: 1 } } }),
  ]);
  return ok(res, { liked: true });
});

/** POST /api/comments/:id/report — denunciar comentário. */
commentsRouter.post('/comments/:id/report', requireAuth, async (req, res) => {
  const { category, description } = req.body as { category?: string; description?: string };
  if (!category) return fail(res, 'VALIDATION_ERROR', 'category é obrigatório.');

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      targetType: 'COMMENT',
      targetId: req.params.id,
      category: category as never,
      description,
    },
  });
  return ok(res, report, 201);
});
