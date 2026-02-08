import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_LOCK_PREFIX,
  IDEMPOTENCY_LOCK_TIMEOUT_MS,
} from './idempotency.constants';

export interface CachedResponse {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type IdempotencyCheckResult =
  | { status: 'cached'; response: CachedResponse }
  | { status: 'locked' }
  | { status: 'new' };

@Injectable()
export class IdempotencyService {
  constructor(@Inject(CACHE_MANAGER) private cacheService: Cache) {}

  /**
   * Check if the idempotency key exists and acquire a lock if not.
   * @returns 'cached' with response if key exists, 'locked' if another request is processing, 'new' if lock acquired
   */
  async checkAndLock(
    idempotencyKey: string,
    keyPrefix?: string,
  ): Promise<IdempotencyCheckResult> {
    const fullKey = this.buildKey(idempotencyKey, keyPrefix);
    const lockKey = this.buildLockKey(idempotencyKey, keyPrefix);

    // 1. Check if response is already cached
    const cached = await this.cacheService.get<CachedResponse>(fullKey);
    if (cached) {
      return { status: 'cached', response: cached };
    }

    // 2. Try to acquire lock (simple Redis SETNX pattern via cache-manager)
    const existingLock = await this.cacheService.get<string>(lockKey);
    if (existingLock) {
      return { status: 'locked' };
    }

    // 3. Set lock with timeout
    await this.cacheService.set(
      lockKey,
      'processing',
      IDEMPOTENCY_LOCK_TIMEOUT_MS,
    );

    return { status: 'new' };
  }

  /**
   * Cache the response for the idempotency key and release the lock.
   */
  async cacheResponse(
    idempotencyKey: string,
    response: CachedResponse,
    ttlSeconds: number,
    keyPrefix?: string,
  ): Promise<void> {
    const fullKey = this.buildKey(idempotencyKey, keyPrefix);
    const lockKey = this.buildLockKey(idempotencyKey, keyPrefix);

    // Store response with TTL (cache-manager uses milliseconds)
    await this.cacheService.set(fullKey, response, ttlSeconds * 1000);

    // Release lock
    await this.cacheService.del(lockKey);
  }

  /**
   * Release the lock without caching (on error).
   */
  async releaseLock(idempotencyKey: string, keyPrefix?: string): Promise<void> {
    const lockKey = this.buildLockKey(idempotencyKey, keyPrefix);
    await this.cacheService.del(lockKey);
  }

  private buildKey(idempotencyKey: string, keyPrefix?: string): string {
    const prefix = keyPrefix ? `${keyPrefix}:` : '';
    return `${IDEMPOTENCY_KEY_PREFIX}${prefix}${idempotencyKey}`;
  }

  private buildLockKey(idempotencyKey: string, keyPrefix?: string): string {
    const prefix = keyPrefix ? `${keyPrefix}:` : '';
    return `${IDEMPOTENCY_LOCK_PREFIX}${prefix}${idempotencyKey}`;
  }
}
