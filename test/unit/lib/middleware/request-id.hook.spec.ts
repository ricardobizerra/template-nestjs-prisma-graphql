import { describe, it, expect, vi } from 'vitest';
import { REQUEST_ID_HEADER, requestIdHook } from '@/lib/middleware/request-id.hook';

describe('requestIdHook', () => {
  it('adds request id header to response', async () => {
    const request = { id: 'rid-1' } as any;
    const reply = { header: vi.fn() } as any;
    await requestIdHook(request, reply);
    expect(reply.header).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'rid-1');
  });
});
