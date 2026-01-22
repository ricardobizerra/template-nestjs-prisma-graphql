import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * List of tables to clean, in order respecting foreign key constraints.
 * Add new tables here as your schema grows.
 */
const TABLES_TO_CLEAN = ['PasswordResetToken', 'OAuthAccount', 'User'] as const;

/**
 * Cleans all test data from the database.
 * Call this in afterEach or afterAll to ensure test isolation.
 *
 * @example
 * afterEach(async () => {
 *   await cleanDatabase();
 * });
 */
export async function cleanDatabase(): Promise<void> {
  // Delete in order respecting foreign keys
  for (const table of TABLES_TO_CLEAN) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

/**
 * Cleans specific tables by name.
 *
 * @example
 * await cleanTables(['User', 'OAuthAccount']);
 */
export async function cleanTables(tables: string[]): Promise<void> {
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

/**
 * Resets user-specific data without touching other tables.
 * Useful for auth-related tests.
 */
export async function cleanUsers(): Promise<void> {
  await cleanTables(['PasswordResetToken', 'OAuthAccount', 'User']);
}

/**
 * Disconnects from the database.
 * Call this in afterAll to close connections.
 *
 * @example
 * afterAll(async () => {
 *   await disconnectDatabase();
 * });
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Gets the Prisma client for direct database operations.
 */
export function getTestPrisma(): PrismaClient {
  return prisma;
}
