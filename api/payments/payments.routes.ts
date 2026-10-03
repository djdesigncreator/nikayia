import { Router } from 'express';
import { BubbleService } from '../../services/BubbleService';
import { createNotification } from '../notifications/notifications.routes';
import { ok, fail } from '../../utils/response';

export const paymentsRouter = Router();

interface BubblePayment {
  _id: string;
  subscriber_id: string;
  creator_id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string;
  purpose: string;
}

const SUBSCRIPTION_DAYS = 30;

/**
 * POST /api/payments/webhook — chamado pelo mozpayment.co.mz quando um
 * pagamento (M-Pesa, eMola ou cartão) conclui.
 * Body: { transaction_id, reference, status, payment_method, wallet,
 *          amount, phone, client_name, product_name, reason, timestamp }
 *
 * `reason` é a referência que guardámos ao iniciar o pagamento (idpayment
 * para M-Pesa/eMola, session_id para cartão) — é assim que sabemos a qual
 * Payment nosso isto corresponde. Esta rota NÃO tem requireAuth: quem a
 * chama é o servidor do mozpayment.co.mz, não um utilizador logado.
 */
paymentsRouter.post('/webhook', async (req, res) => {
  const { reason, status } = req.body as { reason?: string; status?: string };
  if (!reason) return fail(res, 'VALIDATION_ERROR', 'reason em falta.');

  const { items } = await BubbleService.list<BubblePayment>('Payment', {
    constraints: [{ key: 'reference', constraint_type: 'equals', value: reason }],
  });
  const payment = items[0];
  if (!payment) return fail(res, 'NOT_FOUND', 'Pagamento não encontrado para esta referência.', 404);

  const isComplete = status?.toLowerCase() === 'complete';
  await BubbleService.update('Payment', payment._id, { status: isComplete ? 'COMPLETED' : 'FAILED' });

  if (isComplete && payment.purpose === 'SUBSCRIPTION') {
    const expiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { items: subs } = await BubbleService.list<{ _id: string }>('Subscription', {
      constraints: [
        { key: 'subscriber_id', constraint_type: 'equals', value: payment.subscriber_id },
        { key: 'creator_id', constraint_type: 'equals', value: payment.creator_id },
      ],
    });

    if (subs.length > 0) {
      await BubbleService.update('Subscription', subs[0]._id, { status: 'ACTIVE', expires_at: expiresAt });
    } else {
      await BubbleService.create('Subscription', {
        subscriber_id: payment.subscriber_id,
        creator_id: payment.creator_id,
        status: 'ACTIVE',
        expires_at: expiresAt,
      });
    }

    await createNotification({ recipientId: payment.creator_id, actorId: payment.subscriber_id, type: 'FOLLOW' });
  }

  // O mozpayment.co.mz só precisa de um 200 a confirmar que recebemos.
  return ok(res, { received: true });
});

/** GET /api/payments/:id/status — para o frontend confirmar o estado de um pagamento específico. */
paymentsRouter.get('/:id/status', async (req, res) => {
  const payment = await BubbleService.get<BubblePayment>('Payment', req.params.id);
  if (!payment) return fail(res, 'NOT_FOUND', 'Pagamento não encontrado.', 404);
  return ok(res, { status: payment.status });
});
