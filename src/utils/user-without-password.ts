import { User } from '@prisma/client';

export function userWithoutPassword(user: User) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
