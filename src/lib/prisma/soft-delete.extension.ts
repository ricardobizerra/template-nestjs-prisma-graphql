import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Dynamically identify models that support soft delete (have a deletedAt field)
 * by inspecting the Prisma metadata at runtime.
 */
const dmmf = (Prisma as any).dmmf;
export const SOFT_DELETE_MODELS = dmmf.datamodel.models
  .filter((model: any) =>
    model.fields.some((field: any) => field.name === 'deletedAt'),
  )
  .map((model: any) => model.name) as string[];

export type SoftDeleteModel = string;

/**
 * Checks if a model supports soft delete.
 */
function isSoftDeleteModel(model: string): boolean {
  return SOFT_DELETE_MODELS.includes(model);
}

/**
 * Configures soft delete middleware on a Prisma client.
 *
 * When enabled:
 * - `delete` operations are converted to `update` with `deletedAt = now()`
 * - `deleteMany` operations are converted to `updateMany` with `deletedAt = now()`
 * - `findMany`, `findFirst`, `findUnique` automatically filter out soft-deleted records
 * - `count` automatically filters out soft-deleted records
 *
 * To include soft-deleted records in queries, add `deletedAt: { not: null }` or
 * any other deletedAt condition to your where clause.
 *
 * To permanently delete, use `prisma.hardDelete()` method.
 *
 * @example
 * const prisma = new PrismaClient();
 * configureSoftDelete(prisma);
 */
export function configureSoftDelete(prisma: PrismaClient): void {
  // Middleware for soft delete on delete operations
  prisma.$use(async (params, next) => {
    if (!params.model || !isSoftDeleteModel(params.model)) {
      return next(params);
    }

    // Convert delete to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
      return next(params);
    }

    // Convert deleteMany to soft delete
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
      return next(params);
    }

    return next(params);
  });

  // Middleware to filter out soft-deleted records on read operations
  prisma.$use(async (params, next) => {
    if (!params.model || !isSoftDeleteModel(params.model)) {
      return next(params);
    }

    // Add deletedAt: null filter for read operations
    if (
      params.action === 'findMany' ||
      params.action === 'findFirst' ||
      params.action === 'count'
    ) {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }

      // Only add filter if deletedAt is not already specified
      if (!('deletedAt' in params.args.where)) {
        params.args.where.deletedAt = null;
      }
    }

    // For findUnique, we can't add where conditions, so check after
    if (params.action === 'findUnique') {
      const result = await next(params);
      if (result && 'deletedAt' in result && result.deletedAt !== null) {
        return null;
      }
      return result;
    }

    return next(params);
  });
}

/**
 * Wrapper to execute a hard (permanent) delete bypassing soft delete middleware.
 * Use this when you need to permanently remove records.
 *
 * @example
 * await executeHardDelete(prisma, 'User', { id: 'user-123' });
 */
export async function executeHardDelete(
  prisma: PrismaClient,
  model: SoftDeleteModel,
  where: { id: string },
): Promise<void> {
  await prisma.$executeRaw`DELETE FROM ${Prisma.raw(`"${model}"`)} WHERE id = ${where.id}`;
}

/**
 * Restore a soft-deleted record.
 *
 * @example
 * await restoreSoftDeleted(prisma, 'User', 'user-123');
 */
export async function restoreSoftDeleted(
  prisma: PrismaClient,
  model: SoftDeleteModel,
  id: string,
): Promise<void> {
  await prisma.$executeRaw`UPDATE ${Prisma.raw(`"${model}"`)} SET "deletedAt" = NULL WHERE id = ${id}`;
}

/**
 * Find all soft-deleted records for a model.
 *
 * @example
 * const deletedUsers = await findSoftDeleted(prisma, 'User');
 */
export async function findSoftDeleted<T>(
  prisma: PrismaClient,
  model: SoftDeleteModel,
): Promise<T[]> {
  return prisma.$queryRaw<
    T[]
  >`SELECT * FROM ${Prisma.raw(`"${model}"`)} WHERE "deletedAt" IS NOT NULL`;
}
