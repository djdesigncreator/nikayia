import axios from 'axios';
import crypto from 'crypto';
import { env, requireEnv } from '../config/env';

const STORAGE_BASE = env.BUNNY_STORAGE_REGION
  ? `https://${env.BUNNY_STORAGE_REGION}.storage.bunnycdn.com`
  : 'https://storage.bunnycdn.com';

/**
 * Camada única de acesso ao Bunny.net. Nenhuma outra parte do código deve
 * falar diretamente com a API do Bunny — só este serviço.
 * Credenciais vêm exclusivamente de variáveis de ambiente do backend.
 */
export const BunnyService = {
  /** Constrói a URL pública (CDN) de um ficheiro a partir do seu path na storage zone. */
  getCdnUrl(path: string): string {
    return `https://${requireEnv('BUNNY_CDN_HOSTNAME')}/${path.replace(/^\//, '')}`;
  },

  /**
   * Faz upload direto de um buffer (uso interno/admin). Para uploads vindos
   * do cliente, preferir generateSignedUploadUrl e deixar o cliente fazer
   * upload diretamente ao Bunny, poupando banda ao nosso backend.
   */
  async uploadBuffer(path: string, buffer: Buffer, contentType: string): Promise<string> {
    await axios.put(`${STORAGE_BASE}/${requireEnv('BUNNY_STORAGE_ZONE')}/${path}`, buffer, {
      headers: {
        AccessKey: requireEnv('BUNNY_STORAGE_API_KEY'),
        'Content-Type': contentType,
      },
    });
    return this.getCdnUrl(path);
  },

  async deleteFile(path: string): Promise<void> {
    await axios.delete(`${STORAGE_BASE}/${requireEnv('BUNNY_STORAGE_ZONE')}/${path}`, {
      headers: { AccessKey: requireEnv('BUNNY_STORAGE_API_KEY') },
    });
  },

  /**
   * Gera uma URL de upload assinada e de curta duração para o cliente
   * (frontend) fazer upload direto, sem nunca ver a AccessKey do Bunny.
   * Requer que a Storage Zone tenha "Token Authentication" ativado, ou
   * usar o Bunny Stream Direct Upload API para vídeos (recomendado para
   * Reels/Stories em vídeo, que trata também de transcodificação).
   */
  generateSignedUploadUrl(path: string, expiresInSeconds = 300): { url: string; expires: number } {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = crypto
      .createHmac('sha256', requireEnv('BUNNY_STORAGE_API_KEY'))
      .update(`${path}${expires}`)
      .digest('hex');

    return {
      url: `${STORAGE_BASE}/${requireEnv('BUNNY_STORAGE_ZONE')}/${path}?signature=${signature}&expires=${expires}`,
      expires,
    };
  },

  // ---- Bunny Stream (vídeo) ----
  // Produto separado da Storage Zone: transcodifica, gera thumbnail e serve
  // em HLS adaptativo. Usar sempre que o conteúdo for vídeo (Reels, vídeos
  // de posts, Stories em vídeo). A API Key da Video Library nunca sai daqui.

  /** Cria a "ficha" do vídeo no Bunny Stream. Devolve o videoId (guid). */
  async createStreamVideo(title: string): Promise<string> {
    const { data } = await axios.post(
      `https://video.bunnycdn.com/library/${requireEnv('BUNNY_STREAM_LIBRARY_ID')}/videos`,
      { title },
      { headers: { AccessKey: requireEnv('BUNNY_STREAM_API_KEY'), 'Content-Type': 'application/json' } },
    );
    return data.guid as string;
  },

  /**
   * Gera as credenciais de uma sessão de upload direto (TUS) para o
   * cliente enviar o ficheiro de vídeo sem passar pelo nosso servidor e
   * sem nunca ver a API Key. Ver https://docs.bunny.net/docs/stream-direct-upload
   */
  getStreamUploadCredentials(videoId: string, expiresInSeconds = 3600) {
    const expiration = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = crypto
      .createHash('sha256')
      .update(`${requireEnv('BUNNY_STREAM_LIBRARY_ID')}${requireEnv('BUNNY_STREAM_API_KEY')}${expiration}${videoId}`)
      .digest('hex');

    return {
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      libraryId: requireEnv('BUNNY_STREAM_LIBRARY_ID'),
      videoId,
      authorizationSignature: signature,
      authorizationExpire: expiration,
    };
  },

  /** URL de reprodução (HLS) de um vídeo já processado pelo Bunny Stream. */
  getStreamPlaybackUrl(videoId: string): string {
    return `https://${requireEnv('BUNNY_STREAM_CDN_HOSTNAME')}/${videoId}/playlist.m3u8`;
  },

  /** Thumbnail gerado automaticamente pelo Bunny Stream. */
  getStreamThumbnailUrl(videoId: string): string {
    return `https://${requireEnv('BUNNY_STREAM_CDN_HOSTNAME')}/${videoId}/thumbnail.jpg`;
  },
};
