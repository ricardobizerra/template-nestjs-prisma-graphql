import { z } from 'zod';

const ambients = ['development', 'staging', 'production', 'test'] as const;

export const envSchema = z.object({
  APP_NAME: z.coerce.string().optional().default('rblf'),

  PORT: z.coerce.number().optional().default(3333),
  NODE_ENV: z.enum(ambients).default('development'),

  FRONTEND_URL: z.coerce.string(),

  POSTGRES_USER: z.coerce.string(),
  POSTGRES_PASSWORD: z.coerce.string(),
  POSTGRES_DB: z.coerce.string(),
  POSTGRES_HOST: z.coerce.string(),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  DATABASE_URL: z.coerce.string(),

  REDIS_PORT: z.coerce.number().optional().default(6379),
  REDIS_HOST: z.coerce.string(),
  REDIS_USER: z.coerce.string(),
  REDIS_PASSWORD: z.coerce.string(),
  REDIS_DB: z.coerce.number().optional().default(0),
  REDIS_URL: z.coerce.string(),

  JWT_SECRET: z.coerce.string(),
});

export type Env = z.infer<typeof envSchema>;
