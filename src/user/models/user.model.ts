import { Role } from '@prisma/client';

export class UserModel {
  id: string;
  email: string;
  name: string;
  role: Role;
}
