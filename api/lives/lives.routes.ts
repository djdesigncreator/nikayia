import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../utils/auth.middleware';
import { AgoraService } from '../../services/AgoraService';
import { ok, fail } from '../../utils/response';

export const livesRouter = Router();

function agoraUidFor(userId: string): number {
  return parseInt(crypto.createHash('md5').update(userId).digest('hex').slice(0, 8), 16);
}

/** POST /api/lives — agendar/criar uma live (gera o canal Agora). */
livesRouter.post('/', requireAuth, requireRole('CREATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { title, description, category } = req.body as { title?: string; description?: string; category?: string };
  if (!title) return fail(res, 'VALIDATION_ERROR', 'title é obrigatório.');

  const agoraChannelName = AgoraService.createChannelName(req.user!.id);

  const live = await prisma.live.create({
    data: { hostId: req.user!.id, title, description, category, agoraChannelName },
  });

  const { token, expiresAt } = AgoraService.generateRtcToken(agoraChannelName, agoraUidFor(req.user!.id), 'HOST');

  return ok(res, { live, hostToken: token, uid: agoraUidFor(req.user!.id), expiresAt, appId: process.env.AGORA_APP_ID }, 201);
});

/** POST /api/lives/:id/start — marcar como LIVE. Só o host. */
livesRouter.post('/:id/start', requireAuth, async (req, res) => {
  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  if (live.hostId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  const updated = await prisma.live.update({ where: { id: req.params.id }, data: { status: 'LIVE' } });
  return ok(res, updated);
});

/** POST /api/lives/:id/end — encerrar. Só o host (ou moderação, ver /api/admin). */
livesRouter.post('/:id/end', requireAuth, async (req, res) => {
  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  if (live.hostId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  const updated = await prisma.live.update({ where: { id: req.params.id }, data: { status: 'ENDED' } });
  // TODO: se a live tiver sido gravada no Agora Cloud Recording, mover o
  // ficheiro final para o Bunny.net aqui e guardar em `recordingUrl`.
  return ok(res, updated);
});

/** POST /api/lives/:id/join — entrar como espectador, recebe token Agora de VIEWER. */
livesRouter.post('/:id/join', requireAuth, async (req, res) => {
  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  if (live.status !== 'LIVE') return fail(res, 'VALIDATION_ERROR', 'Esta live não está a decorrer.');

  await prisma.$transaction([
    prisma.liveParticipant.upsert({
      where: { liveId_userId: { liveId: live.id, userId: req.user!.id } },
      update: {},
      create: { liveId: live.id, userId: req.user!.id, role: 'VIEWER' },
    }),
    prisma.live.update({ where: { id: live.id }, data: { viewersCount: { increment: 1 } } }),
  ]);

  const uid = agoraUidFor(req.user!.id);
  const { token, expiresAt } = AgoraService.generateRtcToken(live.agoraChannelName, uid, 'VIEWER');

  return ok(res, { channelName: live.agoraChannelName, token, uid, expiresAt, appId: process.env.AGORA_APP_ID });
});

/** POST /api/lives/:id/invite-cohost — promove um utilizador a CO_HOST. Só o host. */
livesRouter.post('/:id/invite-cohost', requireAuth, async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return fail(res, 'VALIDATION_ERROR', 'userId é obrigatório.');

  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  if (live.hostId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.liveParticipant.upsert({
    where: { liveId_userId: { liveId: live.id, userId } },
    update: { role: 'CO_HOST' },
    create: { liveId: live.id, userId, role: 'CO_HOST' },
  });

  const uid = agoraUidFor(userId);
  const { token, expiresAt } = AgoraService.generateRtcToken(live.agoraChannelName, uid, 'CO_HOST');

  // TODO: notificar o utilizador convidado (Notification type LIVE_INVITE)
  // para o frontend dele saber que recebeu este token.
  return ok(res, { channelName: live.agoraChannelName, token, uid, expiresAt });
});

/** DELETE /api/lives/:id/participants/:userId — remover/bloquear participante. Só o host. */
livesRouter.delete('/:id/participants/:userId', requireAuth, async (req, res) => {
  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  if (live.hostId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.liveParticipant.deleteMany({ where: { liveId: live.id, userId: req.params.userId } });
  // A remoção real da chamada (forçar saída) acontece do lado do cliente
  // do utilizador removido, que deve escutar este evento via polling do
  // GET /:id ou, no futuro, via WebSocket/Agora RTM.
  return ok(res, { removed: true });
});

/** GET /api/lives/active — lives atualmente ao vivo. */
livesRouter.get('/active', requireAuth, async (_req, res) => {
  const lives = await prisma.live.findMany({ where: { status: 'LIVE' }, orderBy: { createdAt: 'desc' } });
  return ok(res, lives);
});

livesRouter.get('/:id', requireAuth, async (req, res) => {
  const live = await prisma.live.findUnique({ where: { id: req.params.id } });
  if (!live) return fail(res, 'NOT_FOUND', 'Live não encontrada.', 404);
  return ok(res, live);
});

/** POST /api/lives/:id/comments — comentar na live (chat). */
livesRouter.post('/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content?.trim()) return fail(res, 'VALIDATION_ERROR', 'content é obrigatório.');

  const comment = await prisma.liveComment.create({
    data: { liveId: req.params.id, userId: req.user!.id, content: content.trim() },
  });
  return ok(res, comment, 201);
});

/** GET /api/lives/:id/comments?after= — usado pelo frontend em polling para o chat. */
livesRouter.get('/:id/comments', requireAuth, async (req, res) => {
  const after = req.query.after as string | undefined;
  const comments = await prisma.liveComment.findMany({
    where: { liveId: req.params.id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  return ok(res, comments);
});
