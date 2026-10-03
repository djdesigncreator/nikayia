import { Router } from 'express';
import { requireAuth, requireRole } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { ok, fail } from '../../utils/response';

export const reportsRouter = Router();

interface BubbleReport {
  _id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  category: string;
  description?: string;
  status: string;
}

/** GET /api/reports?status= — listar denúncias. Só moderação/admin. */
reportsRouter.get('/', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const { items } = await BubbleService.list<BubbleReport>('Report', {
    constraints: status ? [{ key: 'status', constraint_type: 'equals', value: status }] : undefined,
    limit: 100,
    sortField: 'Created Date',
    descending: true,
  });
  return ok(res, items);
});

/** PATCH /api/reports/:id — atualizar estado. Só moderação/admin. */
reportsRouter.patch('/:id', requireAuth, requireRole('MODERATOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { status } = req.body as { status?: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED' };
  if (!status) return fail(res, 'VALIDATION_ERROR', 'status é obrigatório.');

  await BubbleService.update('Report', req.params.id, { status });
  await BubbleService.create('AdminAction', {
    admin_id: req.user!.id,
    action_type: 'REVIEW_REPORT',
    target_id: req.params.id,
    notes: `Denúncia marcada como ${status}`,
  });

  const report = await BubbleService.get<BubbleReport>('Report', req.params.id);
  return ok(res, report);
});
