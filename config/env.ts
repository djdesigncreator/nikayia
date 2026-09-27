import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  BUBBLE_JWT_SECRET: z.string().optional(),
  BUBBLE_JWKS_URL: z.string().optional(),
  BUBBLE_API_BASE_URL: z.string(), // ex.: https://nikayia.bubbleapps.io/version-test/api/1.1/wf
  BUNNY_STORAGE_ZONE: z.string(),
  BUNNY_STORAGE_API_KEY: z.string(),
  BUNNY_STORAGE_REGION: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string(),
  AGORA_APP_ID: z.string(),
  AGORA_APP_CERTIFICATE: z.string(),
  AGORA_TOKEN_EXPIRATION_SECONDS: z.string().default('3600'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
