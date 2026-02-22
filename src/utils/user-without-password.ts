import * as schema from '@/lib/drizzle/schema';
import { UserModel } from '@/user/models/user.model';

type User = typeof schema.users.$inferSelect;

export function userWithoutPassword(user: User): UserModel {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
