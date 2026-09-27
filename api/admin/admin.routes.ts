import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../../utils/auth.middleware';
import { ok } from '../../utils/response';

export const adminRouter = Router();
const prisma = new PrismaClient();

async function logAction(adminId: string, actionType: string, targetId: string, notes?: string) {
  await prisma.adminAction.create({ data: { adminId, actionType, targetId, notes } });
}

/** GET /api/admin/stats — números gerais da plataforma. */
adminRouter.get('/stats', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
  const [totalUsers, newUsersToday, totalPosts, totalReels, totalStories, activeLives, pendingReports, bannedUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.post.count(),
      prisma.reel.count(),
      prisma.story.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.live.count({ where: { status: 'LIVE' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
    ]);

  return ok(res, { totalUsers, newUsersToday, totalPosts, totalReels, totalStories, activeLives, pendingReports, bannedUsers });
});

/** PATCH /api/admin/users/:id/suspend */
adminRouter.patch('/users/:id/suspend', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
  await logAction(req.user!.id, 'SUSPEND_USER', user.id);
  return ok(res, user);
});

/** PATCH /api/admin/users/:id/ban */
adminRouter.patch('/users/:id/ban', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'BANNED' } });
  await logAction(req.user!.id, 'BAN_USER', user.id);
  return ok(res, user);
});

/** DELETE /api/admin/posts/:id */
adminRouter.delete('/posts/:id', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  await prisma.post.delete({ where: { id: req.params.id } }).catch(() => null);
  await logAction(req.user!.id, 'REMOVE_POST', req.params.id);
  return ok(res, { deleted: true });
});

/** DELETE /api/admin/reels/:id */
adminRouter.delete('/reels/:id', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  await prisma.reel.delete({ where: { id: req.params.id } }).catch(() => null);
  await logAction(req.user!.id, 'REMOVE_REEL', req.params.id);
  return ok(res, { deleted: true });
});

/** POST /api/admin/lives/:id/end — encerrar live remotamente. */
adminRouter.post('/lives/:id/end', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const live = await prisma.live.update({ where: { id: req.params.id }, data: { status: 'ENDED' } });
  await logAction(req.user!.id, 'END_LIVE', live.id);
  return ok(res, live);
});
