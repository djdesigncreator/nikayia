import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../utils/auth.middleware';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { paginated } from '../../utils/response';

export const exploreRouter = Router();

/**
 * GET /api/explore?cursor=&limit= — grelha de conteúdo recomendado.
 * Versão inicial: mistura reels e posts com imagem/vídeo, ordenados por
 * popularidade simples (likes + views). Para já ignora-se personalização
 * por utilizador — ver ARCHITECTURE.md secção 5 (feed inteligente) para a
 * evolução futura deste algoritmo.
 */
exploreRouter.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 24), 60);
  const cursor = decodeCursor(req.query.cursor as string | undefined);

  const [posts, reels] = await Promise.all([
    prisma.post.findMany({
      where: {
        type: { in: ['IMAGE', 'VIDEO', 'CAROUSEL'] },
        ...(cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : {}),
      },
      orderBy: { likesCount: 'desc' },
      take: limit,
      include: { media: true },
    }),
    prisma.reel.findMany({
      where: cursor ? { createdAt: { lt: new Date(cursor.createdAt) } } : undefined,
      orderBy: { viewsCount: 'desc' },
      take: limit,
    }),
  ]);

  const items = [
    ...posts.map((p) => ({ kind: 'post' as const, ...p })),
    ...reels.map((r) => ({ kind: 'reel' as const, ...r })),
  ].sort(() => Math.random() - 0.5); // baralhar para dar sensação de "grelha" variada

  const last = items[items.length - 1] as { createdAt?: Date; id: string } | undefined;
  const nextCursor = last?.createdAt ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

  return paginated(res, items, nextCursor);
});
