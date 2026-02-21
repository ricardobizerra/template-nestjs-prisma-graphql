import { describe, it, expect, vi } from 'vitest';
import { BullMqMailQueueAdapter } from '@/infrastructure/messaging/adapters/mail-queue.adapter';

describe('BullMqMailQueueAdapter', () => {
  it('adds password-reset job', async () => {
    const queue = { add: vi.fn() } as any;
    const adapter = new BullMqMailQueueAdapter(queue);
    await adapter.enqueuePasswordReset({ email: 'a@a.com', token: 't' });
    expect(queue.add).toHaveBeenCalledWith('password-reset', { email: 'a@a.com', token: 't' });
  });
});
