import { z } from 'zod';

const ambients = ['development', 'staging', 'production'] as const;

export const envSchema = z.object({
  APP_NAME: z.coerce.string().optional().default('rblf'),
  PORT: z.coerce.number().optional().default(3333),
  NODE_ENV: z.enum(ambients).default('development'),
  POSTGRES_USER: z.coerce.string(),
  POSTGRES_PASSWORD: z.coerce.string(),
  POSTGRES_DB: z.coerce.string(),
  POSTGRES_HOST: z.coerce.string(),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  DATABASE_URL: z.coerce.string(),
});

export type Env = z.infer<typeof envSchema>;
