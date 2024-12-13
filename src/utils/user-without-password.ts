import { User } from '@prisma/client';
import { UserModel } from '@/user/models/user.model';
import { Role } from '@/lib/graphql/prisma-client';

export function userWithoutPassword(user: User): UserModel {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    role: Role[user.role],
  };
}
