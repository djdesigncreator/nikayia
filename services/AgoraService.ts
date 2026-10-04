import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import crypto from 'crypto';
import { env, requireEnv } from '../config/env';

export type AgoraParticipantRole = 'HOST' | 'CO_HOST' | 'VIEWER';

/**
 * Camada única de acesso ao Agora.io. O App Certificate NUNCA sai daqui —
 * o frontend só recebe o token já gerado, nunca as credenciais.
 */
export const AgoraService = {
  /** Nome de canal único e legível para uma nova live. */
  createChannelName(hostId: string): string {
    return `live_${hostId}_${crypto.randomBytes(4).toString('hex')}`;
  },

  /**
   * Gera um token RTC válido por um utilizador/canal. HOST e CO_HOST recebem
   * role PUBLISHER (podem enviar vídeo/áudio); VIEWER recebe SUBSCRIBER.
   */
  generateRtcToken(channelName: string, uid: number, role: AgoraParticipantRole): { token: string; expiresAt: number } {
    const expirationTimeInSeconds = Number(env.AGORA_TOKEN_EXPIRATION_SECONDS);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraRole = role === 'VIEWER' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      requireEnv('AGORA_APP_ID'),
      requireEnv('AGORA_APP_CERTIFICATE'),
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs,
    );

    return { token, expiresAt: privilegeExpiredTs };
  },
};
