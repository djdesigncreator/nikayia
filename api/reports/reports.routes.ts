import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../utils/auth.middleware';
import { ok, fail } from '../../utils/response';

export const reportsRouter = Router();

/** GET /api/reports?status= — listar denúncias. Só moderação/admin. */
reportsRouter.get('/', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const reports = await prisma.report.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, reports);
});

/** PATCH /api/reports/:id — atualizar estado / registar ação tomada. Só moderação/admin. */
reportsRouter.patch('/:id', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { status } = req.body as { status?: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED' };
  if (!status) return fail(res, 'VALIDATION_ERROR', 'status é obrigatório.');

  const report = await prisma.report.update({ where: { id: req.params.id }, data: { status } });

  await prisma.adminAction.create({
    data: {
      adminId: req.user!.id,
      actionType: 'REVIEW_REPORT',
      targetId: report.id,
      notes: `Denúncia marcada como ${status}`,
    },
  });

  return ok(res, report);
});
