import { describe, it, expect, vi } from 'vitest';
import { RedisDomainEventPublisherAdapter } from '@/infrastructure/messaging/adapters/domain-event-publisher.adapter';

describe('RedisDomainEventPublisherAdapter', () => {
  it('publishes userAdded payload', async () => {
    const redis = { publish: vi.fn() } as any;
    const adapter = new RedisDomainEventPublisherAdapter(redis);
    await adapter.publishUserCreated({ email: 'a@a.com', name: 'A', role: 'USER' });
    expect(redis.publish).toHaveBeenCalledWith('userAdded', {
      userAdded: { email: 'a@a.com', name: 'A', role: 'USER' },
    });
  });
});
