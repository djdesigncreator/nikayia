import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { createNotification } from '../notifications/notifications.routes';
import { ok, fail } from '../../utils/response';

export const usersRouter = Router();
const prisma = new PrismaClient();

usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { profile: true },
  });
  if (!user) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);
  return ok(res, user);
});

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const { displayName, bio, avatarUrl, location, isPrivate } = req.body;

  if (typeof isPrivate === 'boolean') {
    await prisma.user.update({ where: { id: req.user!.id }, data: { isPrivate } });
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.user!.id },
    update: { displayName, bio, avatarUrl, location },
    create: { userId: req.user!.id, displayName: displayName ?? 'Utilizador', bio, avatarUrl, location },
  });

  return ok(res, profile);
});

usersRouter.get('/:id', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { profile: true },
  });
  if (!user) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);
  return ok(res, user);
});

usersRouter.post('/:id/follow', requireAuth, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user!.id) return fail(res, 'VALIDATION_ERROR', 'Não pode seguir-se a si próprio.');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return fail(res, 'NOT_FOUND', 'Utilizador não encontrado.', 404);

  if (target.isPrivate) {
    const request = await prisma.followRequest.upsert({
      where: { requesterId_targetId: { requesterId: req.user!.id, targetId } },
      update: {},
      create: { requesterId: req.user!.id, targetId },
    });
    await createNotification({ recipientId: targetId, actorId: req.user!.id, type: 'FOLLOW_REQUEST' });
    return ok(res, { status: 'PENDING', request });
  }

  const follow = await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: targetId } },
    update: {},
    create: { followerId: req.user!.id, followingId: targetId },
  });
  await createNotification({ recipientId: targetId, actorId: req.user!.id, type: 'FOLLOW' });
  return ok(res, { status: 'FOLLOWING', follow });
});

usersRouter.delete('/:id/follow', requireAuth, async (req, res) => {
  await prisma.follow.deleteMany({
    where: { followerId: req.user!.id, followingId: req.params.id },
  });
  return ok(res, { status: 'UNFOLLOWED' });
});

// TODO: /followers, /following (cursor pagination), /block, /mute — seguir o
// mesmo padrão de users/:id/follow acima, usando os modelos Follow/Block/Mute.
