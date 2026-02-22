import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool();
const db = drizzle(pool);

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
    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
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
    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
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
  await pool.end();
}

/**
 * Gets the Drizzle client for direct database operations.
 */
export function getTestDb() {
  return db;
}
