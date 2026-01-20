import { z } from 'zod';

const ambients = ['development', 'staging', 'production', 'test'] as const;
const developmentTypes = ['local', 'deploy'] as const;

export const envSchema = z.object({
  APP_NAME: z.coerce.string().optional().default('rblf'),

  PORT: z.coerce.number().optional().default(3333),
  NODE_ENV: z.enum(ambients),
  DEVELOPMENT_TYPE: z.enum(developmentTypes),

  FRONTEND_URL: z.string(),

  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  DATABASE_URL: z.string(),

  REDIS_PORT: z.coerce.number().optional().default(6379),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_DB: z.coerce.number().optional().default(0),
  REDIS_URL: z.string(),
  REDIS_TTL: z.coerce.number().optional().default(3600),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
});

export type Env = z.infer<typeof envSchema>;
