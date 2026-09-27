import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth.middleware';
import { ok, fail } from '../../utils/response';

export const storiesRouter = Router();
const prisma = new PrismaClient();

const DEFAULT_DURATION_HOURS = 24;

/** POST /api/stories — criar uma story (imagem, vídeo ou texto). */
storiesRouter.post('/', requireAuth, async (req, res) => {
  const { mediaUrl, mediaType, durationHours } = req.body as {
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'TEXT';
    durationHours?: number;
  };

  if (!mediaUrl || !mediaType) return fail(res, 'VALIDATION_ERROR', 'mediaUrl e mediaType são obrigatórios.');

  const expiresAt = new Date(Date.now() + (durationHours ?? DEFAULT_DURATION_HOURS) * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: { authorId: req.user!.id, mediaUrl, mediaType, expiresAt },
  });

  return ok(res, story, 201);
});

/**
 * GET /api/stories/feed — stories ativas de quem o utilizador segue,
 * agrupadas por autor (mais recente primeiro dentro de cada grupo).
 */
storiesRouter.get('/feed', requireAuth, async (req, res) => {
  const following = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });
  const authorIds = following.map((f) => f.followingId);
  authorIds.push(req.user!.id); // incluir as próprias stories

  const stories = await prisma.story.findMany({
    where: { authorId: { in: authorIds }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: {
      views: { where: { viewerId: req.user!.id }, select: { id: true } },
    },
  });

  const grouped = new Map<string, typeof stories>();
  for (const story of stories) {
    const group = grouped.get(story.authorId) ?? [];
    group.push(story);
    grouped.set(story.authorId, group);
  }

  const result = Array.from(grouped.entries()).map(([authorId, items]) => ({
    authorId,
    hasUnseen: items.some((s) => s.views.length === 0),
    stories: items,
  }));

  return ok(res, result);
});

/** GET /api/stories/:id — dados de uma story (para o visualizador). */
storiesRouter.get('/:id', requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story || story.expiresAt < new Date()) return fail(res, 'NOT_FOUND', 'Story não encontrada ou expirada.', 404);
  return ok(res, story);
});

/** POST /api/stories/:id/view — marcar como vista pelo utilizador atual. */
storiesRouter.post('/:id/view', requireAuth, async (req, res) => {
  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: req.params.id, viewerId: req.user!.id } },
    update: {},
    create: { storyId: req.params.id, viewerId: req.user!.id },
  });
  return ok(res, { viewed: true });
});

/** GET /api/stories/:id/viewers — lista de quem viu (só o autor pode consultar). */
storiesRouter.get('/:id/viewers', requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) return fail(res, 'NOT_FOUND', 'Story não encontrada.', 404);
  if (story.authorId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  const viewers = await prisma.storyView.findMany({
    where: { storyId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, viewers);
});

/** DELETE /api/stories/:id — eliminar story própria antes de expirar. */
storiesRouter.delete('/:id', requireAuth, async (req, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) return fail(res, 'NOT_FOUND', 'Story não encontrada.', 404);
  if (story.authorId !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  await prisma.story.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});
