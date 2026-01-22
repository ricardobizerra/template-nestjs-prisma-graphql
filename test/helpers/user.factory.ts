import { PrismaClient, Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface CreateUserOptions {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
}

export interface CreateUserResult extends Omit<User, 'password'> {
  plainPassword: string;
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

  const user = await prisma.user.create({
    data: {
      email: options.email || `test-${randomUUID()}@example.com`,
      name: options.name || 'Test User',
      password: hashedPassword,
      role: options.role || Role.USER,
    },
  });

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
  await prisma.user.delete({ where: { id: userId } }).catch(() => {
    // Ignore if user doesn't exist
  });
}

/**
 * Gets the Prisma client for direct database access in tests.
 */
export function getPrismaClient(): PrismaClient {
  return prisma;
}
