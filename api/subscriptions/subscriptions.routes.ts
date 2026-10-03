import { Router } from 'express';
import { requireAuth } from '../../utils/auth.middleware';
import { BubbleService } from '../../services/BubbleService';
import { MozPaymentService, PaymentMethod } from '../../services/MozPaymentService';
import { createNotification } from '../notifications/notifications.routes';
import { isActiveSubscriber } from '../../utils/premium';
import { ok, fail } from '../../utils/response';

export const subscriptionsRouter = Router();

interface BubbleSubscription {
  _id: string;
  subscriber_id: string;
  creator_id: string;
  status: 'ACTIVE' | 'CANCELLED';
  expires_at?: string;
}

interface BubbleUser {
  _id: string;
  creator_premium_price?: number;
  username?: string;
}

const DEFAULT_PRICE_MZN = 100; // usado se o criador não tiver definido o seu próprio preço
const SUBSCRIPTION_DAYS = 30;

/**
 * POST /api/creators/:id/subscribe
 * Body: { paymentMethod: 'mpesa' | 'emola', phoneNumber: string, payerName: string }
 * Cobra o valor via mozpayment.co.mz ANTES de ativar a subscrição.
 */
subscriptionsRouter.post('/:id/subscribe', requireAuth, async (req, res) => {
  const creatorId = req.params.id;
  if (creatorId === req.user!.id) return fail(res, 'VALIDATION_ERROR', 'Não pode subscrever-se a si próprio.');

  const { paymentMethod, phoneNumber, payerName } = req.body as {
    paymentMethod?: PaymentMethod;
    phoneNumber?: string;
    payerName?: string;
  };
  if (!paymentMethod || !phoneNumber || !payerName) {
    return fail(res, 'VALIDATION_ERROR', 'paymentMethod, phoneNumber e payerName são obrigatórios.');
  }

  const creator = await BubbleService.get<BubbleUser>('User', creatorId);
  if (!creator) return fail(res, 'NOT_FOUND', 'Criador não encontrado.', 404);
  const amount = creator.creator_premium_price ?? DEFAULT_PRICE_MZN;

  let paid: boolean;
  try {
    paid = await MozPaymentService.charge({ paymentMethod, amount, phoneNumber, payerName });
  } catch {
    return fail(res, 'PAYMENT_ERROR', 'Não foi possível contactar o serviço de pagamento. Tente novamente.', 502);
  }
  if (!paid) return fail(res, 'PAYMENT_DECLINED', 'Pagamento não autorizado. Confirme o número e o saldo.', 402);

  const expiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { items } = await BubbleService.list<BubbleSubscription>('Subscription', {
    constraints: [
      { key: 'subscriber_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'creator_id', constraint_type: 'equals', value: creatorId },
    ],
  });

  if (items.length > 0) {
    await BubbleService.update('Subscription', items[0]._id, { status: 'ACTIVE', expires_at: expiresAt });
  } else {
    await BubbleService.create('Subscription', {
      subscriber_id: req.user!.id,
      creator_id: creatorId,
      status: 'ACTIVE',
      expires_at: expiresAt,
    });
  }

  await createNotification({ recipientId: creatorId, actorId: req.user!.id, type: 'FOLLOW' }); // TODO: tipo SUBSCRIPTION próprio
  return ok(res, { status: 'ACTIVE', expiresAt });
});

subscriptionsRouter.delete('/:id/subscribe', requireAuth, async (req, res) => {
  const { items } = await BubbleService.list<BubbleSubscription>('Subscription', {
    constraints: [
      { key: 'subscriber_id', constraint_type: 'equals', value: req.user!.id },
      { key: 'creator_id', constraint_type: 'equals', value: req.params.id },
    ],
  });
  // Cancelar aqui só impede a RENOVAÇÃO — a subscrição continua válida até expires_at,
  // já que o valor já foi pago. Não há reembolso automático.
  if (items.length > 0) await BubbleService.update('Subscription', items[0]._id, { status: 'CANCELLED' });
  return ok(res, { status: 'CANCELLED' });
});

subscriptionsRouter.get('/:id/subscription-status', requireAuth, async (req, res) => {
  const active = await isActiveSubscriber(req.user!.id, req.params.id);
  return ok(res, { active });
});

subscriptionsRouter.get('/:id/subscribers', requireAuth, async (req, res) => {
  if (req.params.id !== req.user!.id) return fail(res, 'FORBIDDEN', 'Sem permissão.', 403);

  const { items } = await BubbleService.list<BubbleSubscription>('Subscription', {
    constraints: [
      { key: 'creator_id', constraint_type: 'equals', value: req.params.id },
      { key: 'status', constraint_type: 'equals', value: 'ACTIVE' },
    ],
    limit: 200,
  });
  return ok(res, items);
});
