import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { createNotification } from '../notifications/notifications.routes';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { ok, fail, paginated } from '../../utils/response';

export const messagesRouter = Router();
const prisma = new PrismaClient();

/** GET /api/conversations — lista de conversas do utilizador, com a última mensagem. */
messagesRouter.get('/conversations', requireAuth, async (req, res) => {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: req.user!.id },
    include: {
      conversation: {
        include: {
          participants: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const conversations = participations
    .map((p) => p.conversation)
    .sort((a, b) => (b.messages[0]?.createdAt.getTime() ?? 0) - (a.messages[0]?.createdAt.getTime() ?? 0));

  return ok(res, conversations);
});

/** POST /api/conversations — iniciar (ou reaproveitar) uma conversa 1:1. */
messagesRouter.post('/conversations', requireAuth, async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return fail(res, 'VALIDATION_ERROR', 'userId é obrigatório.');
  if (userId === req.user!.id) return fail(res, 'VALIDATION_ERROR', 'Não pode iniciar uma conversa consigo próprio.');

  // Procurar uma conversa 1:1 já existente entre os dois.
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: req.user!.id } } },
        { participants: { some: { userId } } },
      ],
    },
    include: { participants: true },
  });

  if (existing && existing.participants.length === 2) {
    return ok(res, existing);
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: req.user!.id }, { userId }] },
    },
    include: { participants: true },
  });

  return ok(res, conversation, 201);
});

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!participant;
}

/** GET /api/conversations/:id/messages?cursor= — histórico, mais recente primeiro, cursor pagination. */
messagesRouter.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const isParticipant = await assertParticipant(req.params.id, req.user!.id);
  if (!isParticipant) return fail(res, 'FORBIDDEN', 'Sem acesso a esta conversa.', 403);

  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const cursor = decodeCursor(req.query.cursor as string | undefined);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: req.params.id,
      ...(cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items.reverse(), nextCursor);
});

/** POST /api/conversations/:id/messages — enviar mensagem (texto e/ou media). */
messagesRouter.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const isParticipant = await assertParticipant(req.params.id, req.user!.id);
  if (!isParticipant) return fail(res, 'FORBIDDEN', 'Sem acesso a esta conversa.', 403);

  const { content, mediaUrl } = req.body as { content?: string; mediaUrl?: string };
  if (!content?.trim() && !mediaUrl) return fail(res, 'VALIDATION_ERROR', 'content ou mediaUrl é obrigatório.');

  const message = await prisma.message.create({
    data: { conversationId: req.params.id, senderId: req.user!.id, content, mediaUrl },
  });

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: req.params.id, userId: { not: req.user!.id } },
  });
  await Promise.all(
    otherParticipants.map((p) =>
      createNotification({ recipientId: p.userId, actorId: req.user!.id, type: 'MESSAGE', entityId: message.id }),
    ),
  );

  return ok(res, message, 201);
});

/** PATCH /api/messages/:id/seen — marcar mensagem como vista. */
messagesRouter.patch('/messages/:id/seen', requireAuth, async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message) return fail(res, 'NOT_FOUND', 'Mensagem não encontrada.', 404);

  const isParticipant = await assertParticipant(message.conversationId, req.user!.id);
  if (!isParticipant) return fail(res, 'FORBIDDEN', 'Sem acesso a esta conversa.', 403);

  const updated = await prisma.message.update({ where: { id: req.params.id }, data: { status: 'SEEN' } });
  return ok(res, updated);
});
