import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { ok, paginated } from '../../utils/response';

export const notificationsRouter = Router();
const prisma = new PrismaClient();

/** GET /api/notifications?cursor=&unread= — lista de notificações do utilizador. */
notificationsRouter.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const cursor = decodeCursor(req.query.cursor as string | undefined);
  const unreadOnly = req.query.unread === 'true';

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: req.user!.id,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items, nextCursor);
});

/** PATCH /api/notifications/:id/read — marcar uma notificação como lida. */
notificationsRouter.patch('/:id/read', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, recipientId: req.user!.id },
    data: { isRead: true },
  });
  return ok(res, { read: true });
});

/** PATCH /api/notifications/read-all — marcar todas como lidas. */
notificationsRouter.patch('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  return ok(res, { read: true });
});

/**
 * Helper interno reutilizável — outras rotas (likes, comentários, follows,
 * mensagens, lives) devem chamar isto para criar a notificação correspondente.
 * Ex.: import { createNotification } from '../notifications/notifications.routes';
 */
export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  type:
    | 'FOLLOW'
    | 'FOLLOW_REQUEST'
    | 'LIKE'
    | 'COMMENT'
    | 'REPLY'
    | 'MENTION'
    | 'SHARE'
    | 'MESSAGE'
    | 'LIVE_STARTED'
    | 'LIVE_INVITE';
  entityId?: string;
}) {
  if (params.recipientId === params.actorId) return; // não notificar a si próprio
  return prisma.notification.create({ data: params });
}
