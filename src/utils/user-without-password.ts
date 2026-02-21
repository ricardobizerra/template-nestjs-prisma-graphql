import { User } from '@prisma/client';
import { UserModel } from '@/user/models/user.model';

export function userWithoutPassword(user: User): UserModel {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
