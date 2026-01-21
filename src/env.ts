import { z } from 'zod';

const ambients = ['development', 'staging', 'production', 'test'] as const;
const developmentTypes = ['local', 'deploy'] as const;
const storageProviders = ['s3', 'r2'] as const;

export const envSchema = z
  .object({
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
    REFRESH_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().optional().default(7),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_CALLBACK_URL: z.string(),

    RESEND_API_KEY: z.string(),
    MAIL_FROM_EMAIL: z.string(),

    SWAGGER_ACCESS_KEY: z.string(),

    // Storage (optional - only required if STORAGE_PROVIDER is set)
    STORAGE_PROVIDER: z.enum(storageProviders).optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_REGION: z.string().optional(), // S3 only
    STORAGE_ENDPOINT: z.string().optional(), // R2 only
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_PROVIDER === 's3') {
      if (!data.STORAGE_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_BUCKET is required when STORAGE_PROVIDER is s3',
          path: ['STORAGE_BUCKET'],
        });
      }
      if (!data.STORAGE_REGION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_REGION is required when STORAGE_PROVIDER is s3',
          path: ['STORAGE_REGION'],
        });
      }
      if (!data.STORAGE_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_ACCESS_KEY is required when STORAGE_PROVIDER is s3',
          path: ['STORAGE_ACCESS_KEY'],
        });
      }
      if (!data.STORAGE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_SECRET_KEY is required when STORAGE_PROVIDER is s3',
          path: ['STORAGE_SECRET_KEY'],
        });
      }
    }

    if (data.STORAGE_PROVIDER === 'r2') {
      if (!data.STORAGE_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_BUCKET is required when STORAGE_PROVIDER is r2',
          path: ['STORAGE_BUCKET'],
        });
      }
      if (!data.STORAGE_ENDPOINT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_ENDPOINT is required when STORAGE_PROVIDER is r2',
          path: ['STORAGE_ENDPOINT'],
        });
      }
      if (!data.STORAGE_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_ACCESS_KEY is required when STORAGE_PROVIDER is r2',
          path: ['STORAGE_ACCESS_KEY'],
        });
      }
      if (!data.STORAGE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_SECRET_KEY is required when STORAGE_PROVIDER is r2',
          path: ['STORAGE_SECRET_KEY'],
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;
