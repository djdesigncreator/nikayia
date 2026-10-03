import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  BUBBLE_JWT_SECRET: z.string().optional(),
  BUBBLE_JWKS_URL: z.string().optional(),
  BUBBLE_API_BASE_URL: z.string(), // Backend Workflows: .../wf
  BUBBLE_DATA_API_BASE_URL: z.string(), // Data API: .../obj
  BUBBLE_API_TOKEN: z.string(),
  BUNNY_STORAGE_ZONE: z.string(),
  BUNNY_STORAGE_API_KEY: z.string(),
  BUNNY_STORAGE_REGION: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string(),

  // Bunny Stream (Video Library) — só para vídeo: transcodificação, thumbnails, streaming adaptativo
  BUNNY_STREAM_LIBRARY_ID: z.string(),
  BUNNY_STREAM_API_KEY: z.string(),
  BUNNY_STREAM_CDN_HOSTNAME: z.string(), // ex.: vz-xxxxx.b-cdn.net (o Pull Zone da Video Library)
  AGORA_APP_ID: z.string(),
  AGORA_APP_CERTIFICATE: z.string(),
  AGORA_TOKEN_EXPIRATION_SECONDS: z.string().default('3600'),
  CORS_ORIGIN: z.string().default('*'),

  // mozpayment.co.mz — cobrança das subscrições premium (M-Pesa / eMola)
  MOZPAYMENT_EMAIL: z.string(),
  MOZPAYMENT_PASSWORD: z.string(),
  MOZPAYMENT_WALLET: z.string(), // id da carteira da Nikayia no mozpayment.co.mz
});

export const env = envSchema.parse(process.env);
