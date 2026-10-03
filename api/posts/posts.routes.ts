import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { createNotification } from '../notifications/notifications.routes';
import { isActiveSubscriber, lockIfNeeded } from '../../utils/premium';
import { ok, fail, paginated } from '../../utils/response';

export const postsRouter = Router();

interface BubblePost {
  _id: string;
  author_id: string;
  type: string;
  caption?: string;
  location?: string;
  visibility: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  media_urls?: string[];
  media_types?: string[];
  is_premium?: boolean;
  'Created Date': string;
}

postsRouter.post('/', requireAuth, async (req, res) => {
  const { type, caption, location, visibility, media, isPremium } = req.body as {
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'LINK';
    caption?: string;
    location?: string;
    visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
    media?: { url: string; type: 'IMAGE' | 'VIDEO' }[];
    isPremium?: boolean; // só conteúdo de assinatura (comunidade premium do criador)
  };

  if (!type) return fail(res, 'VALIDATION_ERROR', 'type é obrigatório.');

  const id = await BubbleService.create('Post', {
    author_id: req.user!.id,
    type,
    caption,
    location,
    visibility: visibility ?? 'PUBLIC',
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    media_urls: media?.map((m) => m.url) ?? [],
    media_types: media?.map((m) => m.type) ?? [],
    is_premium: isPremium ?? false,
  });

  // TODO: extrair hashtags/menções de `caption` e criar Notification/PostHashtag correspondentes.
  const post = await BubbleService.get<BubblePost>('Post', id);
  return ok(res, post, 201);
});

/** GET /api/posts?cursor=&limit= — feed cronológico simples (base para o algoritmo). */
postsRouter.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const cursor = Number(req.query.cursor ?? 0);

  const { items, remaining } = await BubbleService.list<BubblePost>('Post', {
    cursor,
    limit,
    sortField: 'Created Date',
    descending: true,
  });

  // Bloqueia o conteúdo dos posts premium de criadores a quem o utilizador não está subscrito.
  const locked = await Promise.all(
    items.map(async (post) => {
      const canView = !post.is_premium || (await isActiveSubscriber(req.user!.id, post.author_id));
      return lockIfNeeded(post, canView);
    }),
  );

  const nextCursor = remaining > 0 ? String(cursor + items.length) : null;
  return paginated(res, locked, nextCursor);
});

postsRouter.get('/:id', requireAuth, async (req, res) => {
  const post = await BubbleService.get<BubblePost>('Post', req.params.id);
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  const canView = !post.is_premium || (await isActiveSubscriber(req.user!.id, post.author_id));
  return ok(res, lockIfNeeded(post, canView));
});

postsRouter.delete('/:id', requireAuth, async (req, res) => {
  const post = await BubbleService.get<BubblePost>('Post', req.params.id);
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);
  if (post.author_id !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await BubbleService.delete('Post', req.params.id);
  return ok(res, { deleted: true });
});

async function findLike(userId: string, postId: string) {
  const { items } = await BubbleService.list<{ _id: string }>('Like', {
    constraints: [
      { key: 'user_id', constraint_type: 'equals', value: userId },
      { key: 'post_id', constraint_type: 'equals', value: postId },
    ],
  });
  return items[0] ?? null;
}

postsRouter.post('/:id/like', requireAuth, async (req, res) => {
  const post = await BubbleService.get<BubblePost>('Post', req.params.id);
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  const existing = await findLike(req.user!.id, req.params.id);
  if (!existing) {
    await BubbleService.create('Like', { user_id: req.user!.id, post_id: req.params.id });
    await BubbleService.update('Post', req.params.id, { likes_count: (post.likes_count ?? 0) + 1 });
    await createNotification({ recipientId: post.author_id, actorId: req.user!.id, type: 'LIKE', entityId: post._id });
  }
  return ok(res, { liked: true });
});

postsRouter.delete('/:id/like', requireAuth, async (req, res) => {
  const existing = await findLike(req.user!.id, req.params.id);
  if (!existing) return ok(res, { liked: false });

  const post = await BubbleService.get<BubblePost>('Post', req.params.id);
  await BubbleService.delete('Like', existing._id);
  if (post) await BubbleService.update('Post', req.params.id, { likes_count: Math.max(0, (post.likes_count ?? 1) - 1) });
  return ok(res, { liked: false });
});

postsRouter.post('/:id/save', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list<{ _id: string }>('SavedPost', {
    constraints: [
      { key: 'user_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'post_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  if (items.length === 0) await BubbleService.create('SavedPost', { user_id: req.user!.id, post_id: req.params.id });
  return ok(res, { saved: true });
});

postsRouter.delete('/:id/save', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list<{ _id: string }>('SavedPost', {
    constraints: [
      { key: 'user_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'post_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  await Promise.all(items.map((i) => BubbleService.delete('SavedPost', i._id)));
  return ok(res, { saved: false });
});

postsRouter.post('/:id/share', requireAuth, async (req, res) => {
  const post = await BubbleService.get<BubblePost>('Post', req.params.id);
  if (!post) return fail(res, 'NOT_FOUND', 'Publicação não encontrada.', 404);

  await BubbleService.create('Share', { user_id: req.user!.id, post_id: req.params.id });
  await BubbleService.update('Post', req.params.id, { shares_count: (post.shares_count ?? 0) + 1 });
  return ok(res, { shared: true });
});

postsRouter.post('/:id/report', requireAuth, async (req, res) => {
  const { category, description } = req.body as { category?: string; description?: string };
  if (!category) return fail(res, 'VALIDATION_ERROR', 'category é obrigatório.');

  const id = await BubbleService.create('Report', {
    reporter_id: req.user!.id,
    target_type: 'POST',
    target_id: req.params.id,
    category,
    description,
    status: 'PENDING',
  });
  return ok(res, { id }, 201);
});
