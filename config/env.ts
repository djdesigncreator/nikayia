import { z } from 'zod';

// Só o que é preciso para o servidor arrancar e a autenticação funcionar.
// As credenciais de serviços específicos (Bunny, Agora, mozpayment) são
// opcionais aqui — ver requireEnv() abaixo: só falham quando essa
// funcionalidade for mesmo chamada, não impedem o arranque do servidor.
const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),

  BUBBLE_JWT_SECRET: z.string().optional(),
  BUBBLE_JWKS_URL: z.string().optional(),
  BUBBLE_API_BASE_URL: z.string(),
  BUBBLE_DATA_API_BASE_URL: z.string(),
  BUBBLE_API_TOKEN: z.string(),

  BUNNY_STORAGE_ZONE: z.string().optional(),
  BUNNY_STORAGE_API_KEY: z.string().optional(),
  BUNNY_STORAGE_REGION: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
  BUNNY_STREAM_API_KEY: z.string().optional(),
  BUNNY_STREAM_CDN_HOSTNAME: z.string().optional(),

  AGORA_APP_ID: z.string().optional(),
  AGORA_APP_CERTIFICATE: z.string().optional(),
  AGORA_TOKEN_EXPIRATION_SECONDS: z.string().default('3600'),

  MOZPAYMENT_EMAIL: z.string().optional(),
  MOZPAYMENT_PASSWORD: z.string().optional(),
  MOZPAYMENT_WALLET: z.string().optional(),

  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);

/**
 * Usar dentro de cada serviço externo (Agora, Bunny, mozpayment) antes de o
 * chamar de verdade. Se a variável não estiver preenchida, dá um erro claro
 * só nessa chamada — não impede o resto do backend de funcionar.
 */
export function requireEnv<K extends keyof typeof env>(key: K): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} não está configurado no .env — esta funcionalidade ainda não pode ser usada.`);
  }
  return value as string;
}
