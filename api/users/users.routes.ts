import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { createNotification } from '../notifications/notifications.routes';
import { ok, fail } from '../../utils/response';

export const usersRouter = Router();

interface BubbleUser {
  _id: string;
  email?: string;
  username?: string;
  role?: string;
  is_private?: boolean;
  status?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
}

usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await BubbleService.get<BubbleUser>('User', req.user!.id);
  if (!user) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);
  return ok(res, user);
});

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const { displayName, bio, avatarUrl, location, isPrivate } = req.body as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    location?: string;
    isPrivate?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (displayName !== undefined) patch.display_name = displayName;
  if (bio !== undefined) patch.bio = bio;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
  if (location !== undefined) patch.location = location;
  if (isPrivate !== undefined) patch.is_private = isPrivate;

  await BubbleService.update('User', req.user!.id, patch);
  const updated = await BubbleService.get<BubbleUser>('User', req.user!.id);
  return ok(res, updated);
});

usersRouter.get('/:id', requireAuth, async (req, res) => {
  const user = await BubbleService.get<BubbleUser>('User', req.params.id);
  if (!user) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);
  return ok(res, user);
});

/** POST /api/users/:id/follow — Follow é agora um Data Type próprio no Bubble. */
usersRouter.post('/:id/follow', requireAuth, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) return fail(res, 'VALIDATION_ERROR', 'Não pode seguir-se a si próprio.');

  const target = await BubbleService.get<BubbleUser>('User', targetId);
  if (!target) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);

  if (target.is_private) {
    const existing = await BubbleService.list('FollowRequest', {
      constraints: [
        { key: 'requester_id', constraint_type: 'equals', value: req.user!.id },
        { key: 'target_id', constraint_type: 'equals', value: targetId },
      ],
    });
    if (existing.items.length === 0) {
      await BubbleService.create('FollowRequest', { requester_id: req.user!.id, target_id: targetId, status: 'PENDING' });
    }
    await createNotification({ recipientId: targetId, actorId: req.user!.id, type: 'FOLLOW_REQUEST' });
    return ok(res, { status: 'PENDING' });
  }

  const existing = await BubbleService.list('Follow', {
    constraints: [
      { key: 'follower_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'following_id', constraint_type: 'equals', value: targetId },
    ],
  });
  if (existing.items.length === 0) {
    await BubbleService.create('Follow', { follower_id: req.user!.id, following_id: targetId });
  }
  await createNotification({ recipientId: targetId, actorId: req.user!.id, type: 'FOLLOW' });
  return ok(res, { status: 'FOLLOWING' });
});

usersRouter.delete('/:id/follow', requireAuth, async (req, res) => {
  const existing = await BubbleService.list<{ _id: string }>('Follow', {
    constraints: [
      { key: 'follower_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'following_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  await Promise.all(existing.items.map((f) => BubbleService.delete('Follow', f._id)));
  return ok(res, { status: 'UNFOLLOWED' });
});

usersRouter.get('/:id/followers', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list('Follow', {
    constraints: [{ key: 'following_id', constraint_type: 'equals', value: req.params.id }],
    limit: 100,
  });
  return ok(res, items);
});

usersRouter.get('/:id/following', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list('Follow', {
    constraints: [{ key: 'follower_id', constraint_type: 'equals', value: req.params.id }],
    limit: 100,
  });
  return ok(res, items);
});

usersRouter.post('/:id/block', requireAuth, async (req, res) => {
  await BubbleService.create('Block', { user_id: req.user!.id, blocked_id: req.params.id });
  return ok(res, { blocked: true });
});

usersRouter.post('/:id/mute', requireAuth, async (req, res) => {
  await BubbleService.create('Mute', { user_id: req.user!.id, muted_id: req.params.id });
  return ok(res, { muted: true });
});
