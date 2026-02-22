import { Role, users } from '@/lib/drizzle/schema';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getTestDb } from './database.helper';
import { eq } from 'drizzle-orm';

const db = getTestDb();

export interface CreateUserOptions {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
}

export interface CreateUserResult {
  id: string;
  email: string;
  name: string;
  role: Role;
  plainPassword: string;
  image?: string | null;
}

/**
 * Creates a test user with default values.
 * All test users have predictable passwords for authentication tests.
 *
 * @example
 * const user = await createTestUser();
 * const admin = await createTestUser({ role: Role.ADMIN });
 */
export async function createTestUser(
  options: CreateUserOptions = {},
): Promise<CreateUserResult> {
  const plainPassword = options.password || 'TestPass123!';
  const hashedPassword = await hash(plainPassword, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: options.email || `test-${randomUUID()}@example.com`,
      name: options.name || 'Test User',
      password: hashedPassword,
      role: options.role || Role.USER,
    })
    .returning();

  const { password: _, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    plainPassword,
  };
}

/**
 * Creates a test admin user.
 */
export async function createTestAdmin(
  options: Omit<CreateUserOptions, 'role'> = {},
): Promise<CreateUserResult> {
  return createTestUser({ ...options, role: Role.ADMIN });
}

/**
 * Deletes a specific user by ID.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await db
    .delete(users)
    .where(eq(users.id, userId))
    .catch(() => {
      // Ignore if user doesn't exist
    });
}
