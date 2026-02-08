/**
 * Idempotency TTL presets for different use cases (in seconds)
 */
export const IdempotencyTTL = {
  /** Short-lived: UI forms, button clicks (10 minutes) */
  FORM: 600,

  /** Standard: API integrations, webhooks (24 hours) */
  API: 86400,

  /** Long-lived: Financial transactions, critical operations (7 days) */
  FINANCIAL: 604800,
} as const;

export type IdempotencyTTLPreset = keyof typeof IdempotencyTTL;

/** Redis key prefix for idempotency keys */
export const IDEMPOTENCY_KEY_PREFIX = 'idempotency:';

/** Redis key prefix for idempotency locks */
export const IDEMPOTENCY_LOCK_PREFIX = 'idempotency:lock:';

/** Lock timeout in milliseconds (prevents deadlocks) */
export const IDEMPOTENCY_LOCK_TIMEOUT_MS = 30000;

/** Header name for idempotency key */
export const IDEMPOTENCY_HEADER = 'x-idempotency-key';

/** Metadata key for decorator options */
export const IDEMPOTENCY_METADATA_KEY = 'idempotency:options';
