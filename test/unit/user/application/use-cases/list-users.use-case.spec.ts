import { describe, it, expect, vi } from 'vitest';
import { ListUsersUseCase } from '@/user/application/use-cases/list-users.use-case';

describe('ListUsersUseCase', () => {
  it('delegates to repository', async () => {
    const userRepository = { findMany: vi.fn().mockResolvedValue({ edges: [] }) } as any;
    const useCase = new ListUsersUseCase(userRepository);
    const input = { paginationArgs: { first: 1, after: null, before: null, last: null }, searchArgs: { search: '' }, ordenationArgs: { orderBy: 'id', orderDirection: 'asc' } } as any;
    const result = await useCase.execute(input);
    expect(result).toEqual({ edges: [] });
  });
});
