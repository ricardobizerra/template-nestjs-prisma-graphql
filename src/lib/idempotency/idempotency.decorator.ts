import { SetMetadata } from '@nestjs/common';
import {
  IDEMPOTENCY_METADATA_KEY,
  IdempotencyTTL,
  type IdempotencyTTLPreset,
} from './idempotency.constants';

export interface IdempotencyOptions {
  /**
   * TTL for the idempotency key in seconds.
   * Can be a number or a preset: 'FORM' (10min), 'API' (24h), 'FINANCIAL' (7d)
   * @default IdempotencyTTL.FORM (600 seconds)
   */
  ttl?: number | IdempotencyTTLPreset;

  /**
   * Optional prefix for the idempotency key (useful for namespacing)
   */
  keyPrefix?: string;
}

/**
 * Decorator to mark an endpoint as idempotent.
 * Requires the client to send an `X-Idempotency-Key` header.
 *
 * @example
 * // Using preset TTL (recommended)
 * @Idempotent({ ttl: 'FORM' })      // 10 minutes - UI forms
 * @Idempotent({ ttl: 'API' })       // 24 hours - API integrations
 * @Idempotent({ ttl: 'FINANCIAL' }) // 7 days - Financial transactions
 *
 * // Using custom TTL
 * @Idempotent({ ttl: 3600 })        // 1 hour
 *
 * // With key prefix
 * @Idempotent({ ttl: 'FINANCIAL', keyPrefix: 'payment' })
 */
export const Idempotent = (options: IdempotencyOptions = {}) => {
  const resolvedTtl = resolveTtl(options.ttl);

  return SetMetadata(IDEMPOTENCY_METADATA_KEY, {
    ttl: resolvedTtl,
    keyPrefix: options.keyPrefix,
  });
};

function resolveTtl(ttl?: number | IdempotencyTTLPreset): number {
  if (ttl === undefined) {
    return IdempotencyTTL.FORM;
  }

  if (typeof ttl === 'number') {
    return ttl;
  }

  return IdempotencyTTL[ttl];
}
