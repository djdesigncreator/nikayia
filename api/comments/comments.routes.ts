import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { createNotification } from '../notifications/notifications.routes';
import { ok, fail, paginated } from '../../utils/response';

export const commentsRouter = Router();

interface BubblePost {
  _id: string;
  author_id: string;
  comments_count: number;
}

interface BubbleComment {
  _id: string;
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  content: string;
  likes_count: number;
}

commentsRouter.get('/posts/:postId/comments', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const cursor = Number(req.query.cursor ?? 0);

  const { items, remaining } = await BubbleService.list<BubbleComment>('Comment', {
    constraints: [{ key: 'post_id', constraint_type: 'equals', value: req.params.postId }],
    cursor,
    limit,
    sortField: 'Created Date',
    descending: true,
  });

  const nextCursor = remaining > 0 ? String(cursor + items.length) : null;
  return paginated(res, items, nextCursor);
});

commentsRouter.post('/posts/:postId/comments', requireAuth, async (req, res) => {
  const { content, parentCommentId } = req.body as { content?: string; parentCommentId?: string };
  if (!content?.trim()) return fail(res, 'VALIDATION_ERROR', 'content é obrigatório.');

  const post = await BubbleService.get<BubblePost>('Post', req.params.postId);
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  const id = await BubbleService.create('Comment', {
    post_id: req.params.postId,
    author_id: req.user!.id,
    content: content.trim(),
    parent_comment_id: parentCommentId,
    likes_count: 0,
  });
  await BubbleService.update('Post', req.params.postId, { comments_count: (post.comments_count ?? 0) + 1 });

  await createNotification({
    recipientId: post.author_id,
    actorId: req.user!.id,
    type: parentCommentId ? 'REPLY' : 'COMMENT',
    entityId: id,
  });

  const comment = await BubbleService.get<BubbleComment>('Comment', id);
  return ok(res, comment, 201);
});

commentsRouter.delete('/comments/:id', requireAuth, async (req, res) => {
  const comment = await BubbleService.get<BubbleComment>('Comment', req.params.id);
  if (!comment) return fail(res, 'NOT_FOUND', 'Comentário não encontrado.', 404);
  if (comment.author_id !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  const post = await BubbleService.get<BubblePost>('Post', comment.post_id);
  await BubbleService.delete('Comment', req.params.id);
  if (post) await BubbleService.update('Post', comment.post_id, { comments_count: Math.max(0, (post.comments_count ?? 1) - 1) });

  return ok(res, { deleted: true });
});

commentsRouter.post('/comments/:id/like', requireAuth, async (req, res) => {
  const comment = await BubbleService.get<BubbleComment>('Comment', req.params.id);
  if (!comment) return fail(res, 'NOT_FOUND', 'Comentário não encontrado.', 404);

  const { items } = await BubbleService.list<{ _id: string }>('CommentLike', {
    constraints: [
      { key: 'user_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'comment_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  if (items.length === 0) {
    await BubbleService.create('CommentLike', { user_id: req.user!.id, comment_id: req.params.id });
    await BubbleService.update('Comment', req.params.id, { likes_count: (comment.likes_count ?? 0) + 1 });
  }
  return ok(res, { liked: true });
});

commentsRouter.post('/comments/:id/report', requireAuth, async (req, res) => {
  const { category, description } = req.body as { category?: string; description?: string };
  if (!category) return fail(res, 'VALIDATION_ERROR', 'category é obrigatório.');

  const id = await BubbleService.create('Report', {
    reporter_id: req.user!.id,
    target_type: 'COMMENT',
    target_id: req.params.id,
    category,
    description,
    status: 'PENDING',
  });
  return ok(res, { id }, 201);
});
