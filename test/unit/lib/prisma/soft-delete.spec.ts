import { Prisma } from '@prisma/client';
import { configureSoftDelete } from '@/lib/prisma/soft-delete.extension';

describe('SoftDelete Middleware (Unit)', () => {
  // Capture the middlewares registered by configureSoftDelete
  const registeredMiddlewares: any[] = [];
  const mockPrisma: any = {
    $use: vi.fn((mw) => {
      registeredMiddlewares.push(mw);
    }),
  };

  beforeAll(() => {
    // We need to ensure User is considered a soft-delete model.
    // In our implementation, SOFT_DELETE_MODELS is a constant calculated at module load.
    // For unit testing the logic, we'll verify the middleware behavior assuming it identifies the model.
    configureSoftDelete(mockPrisma);
  });

  it('should convert "delete" to "update" with deletedAt', async () => {
    const params: Prisma.MiddlewareParams = {
      model: 'User',
      action: 'delete',
      args: { where: { id: '1' } },
      dataPath: [],
      runInTransaction: false,
    };

    const next = vi.fn().mockResolvedValue({ id: '1' });

    // The first middleware is the one that converts delete -> update
    const conversionMw = registeredMiddlewares[0];

    await conversionMw(params, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        args: expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('should add "deletedAt: null" to read queries', async () => {
    const params: Prisma.MiddlewareParams = {
      model: 'User',
      action: 'findMany',
      args: { where: { name: 'John' } },
      dataPath: [],
      runInTransaction: false,
    };

    const next = vi.fn().mockResolvedValue([]);

    // The second middleware is the one that filters out deleted records
    const filterMw = registeredMiddlewares[1];

    await filterMw(params, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      }),
    );
  });

  it('should filter soft-deleted record after findUnique', async () => {
    const params: Prisma.MiddlewareParams = {
      model: 'User',
      action: 'findUnique',
      args: { where: { id: '1' } },
      dataPath: [],
      runInTransaction: false,
    };

    // Simulate finding a soft-deleted record
    const next = vi.fn().mockResolvedValue({ id: '1', deletedAt: new Date() });

    const filterMw = registeredMiddlewares[1];
    const result = await filterMw(params, next);

    expect(result).toBeNull();
  });

  it('should NOT modify queries for non-soft-delete actions', async () => {
    const params: Prisma.MiddlewareParams = {
      model: 'User',
      action: 'create',
      args: { data: { name: 'John' } },
      dataPath: [],
      runInTransaction: false,
    };

    const next = vi.fn().mockResolvedValue({ id: '1' });

    for (const mw of registeredMiddlewares) {
      await mw(params, next);
    }

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
      }),
    );
  });
});
