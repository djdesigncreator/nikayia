import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { MozPaymentService, MobilePaymentMethod } from '../../services/MozPaymentService';
import { createNotification } from '../notifications/notifications.routes';
import { isActiveSubscriber } from '../../utils/premium';
import { ok, fail } from '../../utils/response';

export const subscriptionsRouter = Router();

interface BubbleUser {
  _id: string;
  creator_premium_price?: number;
  username?: string;
}

const DEFAULT_PRICE_MZN = 100;

/**
 * POST /api/creators/:id/subscribe
 * Body: { paymentMethod: 'mpesa' | 'emola' | 'visa', phoneNumber?, payerName }
 * phoneNumber só é obrigatório para mpesa/emola.
 *
 * Isto só INICIA o pagamento. A subscrição só fica ACTIVE quando o webhook
 * em /api/payments/webhook confirmar — ver api/payments/payments.routes.ts.
 * O frontend deve fazer polling a GET /:id/subscription-status (ou ler o
 * campo `status` do Payment devolvido aqui) até ver `active: true`.
 */
subscriptionsRouter.post('/:id/subscribe', requireAuth, async (req, res) => {
  const creatorId = req.params.id;
  if (creatorId === req.user!.id) return fail(res, 'VALIDATION_ERROR', 'Não pode subscrever-se a si próprio.');

  const { paymentMethod, phoneNumber, payerName } = req.body as {
    paymentMethod?: 'mpesa' | 'emola' | 'visa';
    phoneNumber?: string;
    payerName?: string;
  };
  if (!paymentMethod || !payerName) return fail(res, 'VALIDATION_ERROR', 'paymentMethod e payerName são obrigatórios.');
  if (paymentMethod !== 'visa' && !phoneNumber) return fail(res, 'VALIDATION_ERROR', 'phoneNumber é obrigatório para mpesa/emola.');

  const creator = await BubbleService.get<BubbleUser>('User', creatorId);
  if (!creator) return fail(res, 'NOT_FOUND', 'Criador não encontrado.', 404);
  const amount = creator.creator_premium_price ?? DEFAULT_PRICE_MZN;

  try {
    if (paymentMethod === 'visa') {
      const { url, session_id } = await MozPaymentService.chargeCard({
        amount,
        payerName,
        productName: `Subscrição premium — @${creator.username ?? creatorId}`,
      });

      const paymentId = await BubbleService.create('Payment', {
        subscriber_id: req.user!.id,
        creator_id: creatorId,
        amount,
        payment_method: paymentMethod,
        status: 'PENDING',
        reference: session_id,
        purpose: 'SUBSCRIPTION',
      });

      return ok(res, { status: 'PENDING', embedUrl: url, paymentId });
    }

    const { idpayment } = await MozPaymentService.chargeMobile({
      paymentMethod: paymentMethod as MobilePaymentMethod,
      amount,
      phoneNumber: phoneNumber!,
      payerName,
    });

    const paymentId = await BubbleService.create('Payment', {
      subscriber_id: req.user!.id,
      creator_id: creatorId,
      amount,
      payment_method: paymentMethod,
      status: 'PENDING',
      reference: idpayment,
      purpose: 'SUBSCRIPTION',
    });

    return ok(res, { status: 'PENDING', paymentId });
  } catch {
    return fail(res, 'PAYMENT_ERROR', 'Não foi possível iniciar o pagamento. Tente novamente.', 502);
  }
});

subscriptionsRouter.delete('/:id/subscribe', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list<{ _id: string }>('Subscription', {
    constraints: [
      { key: 'subscriber_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'creator_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  if (items.length > 0) await BubbleService.update('Subscription', items[0]._id, { status: 'CANCELLED' });
  return ok(res, { status: 'CANCELLED' });
});

subscriptionsRouter.get('/:id/subscription-status', requireAuth, async (req, res) => {
  const active = await isActiveSubscriber(req.user!.id, req.params.id);
  return ok(res, { active });
});

subscriptionsRouter.get('/:id/subscribers', requireAuth, async (req, res) => {
  if (req.params.id !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);
  const { items } = await BubbleService.list('Subscription', {
    constraints: [
      { key: 'creator_id', constraint_type: 'equals', value: req.params.id },
      { key: 'status', constraint_type: 'equals', value: 'ACTIVE' },
    ],
    limit: 200,
  });
  return ok(res, items);
});
