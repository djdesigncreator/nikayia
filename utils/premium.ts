import { BubbleService } from '../services/BubbleService';

/** Verifica se `subscriberId` tem uma subscrição ATIVA e ainda dentro do prazo ao criador `creatorId`. */
export async function isActiveSubscriber(subscriberId: string, creatorId: string): Promise<boolean> {
  if (subscriberId === creatorId) return true; // o próprio criador sempre vê o que é seu
  const { items } = await BubbleService.list<{ expires_at?: string }>('Subscription', {
    constraints: [
      { key: 'subscriber_id', constraint_type: 'equals', value: subscriberId },
      { key: 'creator_id', constraint_type: 'equals', value: creatorId },
      { key: 'status', constraint_type: 'equals', value: 'ACTIVE' },
    ],
  });
  const sub = items[0];
  if (!sub) return false;
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false; // pago mas já expirou
  return true;
}

/**
 * Aplica o "bloqueio" a um post/reel premium: se quem pede não é o autor nem
 * assinante ativo, esconde o media e marca `locked: true` — o frontend usa
 * isso para mostrar um cadeado em vez do conteúdo.
 */
export function lockIfNeeded<T extends { is_premium?: boolean; author_id: string; media_urls?: string[]; video_url?: string; thumbnail_url?: string }>(
  item: T,
  canView: boolean,
): T & { locked: boolean } {
  if (!item.is_premium || canView) return { ...item, locked: false };
  return { ...item, media_urls: [], video_url: undefined, locked: true } as T & { locked: boolean };
}
