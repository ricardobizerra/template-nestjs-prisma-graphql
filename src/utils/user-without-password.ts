import { User } from '@prisma/client';
import { UserModel } from '@/user/models/user.model';

export function userWithoutPassword(user: User): UserModel {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
