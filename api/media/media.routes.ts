import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../../utils/auth.middleware';
import { BunnyService } from '../../services/BunnyService';
import { AgoraService, AgoraParticipantRole } from '../../services/AgoraService';
import { ok, fail } from '../../utils/response';

export const mediaRouter = Router();

/**
 * POST /api/media/upload-url
 * Body: { folder: 'posts' | 'reels' | 'stories' | 'avatars', filename: string }
 * Devolve uma URL assinada para o cliente fazer upload direto ao Bunny.net.
 */
mediaRouter.post('/upload-url', requireAuth, (req, res) => {
  const { folder, filename } = req.body as { folder?: string; filename?: string };
  if (!folder || !filename) return fail(res, 'VALIDATION_ERROR', 'folder e filename são obrigatórios.');

  const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${filename}`;
  const path = `${folder}/${req.user!.id}/${safeName}`;
  const { url, expires } = BunnyService.generateSignedUploadUrl(path);

  return ok(res, { uploadUrl: url, cdnUrl: BunnyService.getCdnUrl(path), expires });
});

/**
 * POST /api/media/agora-token
 * Body: { liveId: string, channelName: string, role: 'HOST' | 'CO_HOST' | 'VIEWER' }
 * TODO: validar que req.user tem permissão para o role pedido nesse liveId
 * (ex.: só o dono da live pode pedir role HOST) consultando a tabela Live/LiveParticipant.
 */
mediaRouter.post('/agora-token', requireAuth, (req, res) => {
  const { channelName, role } = req.body as { channelName?: string; role?: AgoraParticipantRole };
  if (!channelName || !role) return fail(res, 'VALIDATION_ERROR', 'channelName e role são obrigatórios.');

  // uid numérico exigido pelo Agora — derivar de forma estável a partir do user.id
  const uid = parseInt(crypto.createHash('md5').update(req.user!.id).digest('hex').slice(0, 8), 16);
  const { token, expiresAt } = AgoraService.generateRtcToken(channelName, uid, role);

  return ok(res, { token, uid, expiresAt, appId: process.env.AGORA_APP_ID });
});
