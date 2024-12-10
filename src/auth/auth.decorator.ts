import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { RoleGuard } from '@/auth/role.guard';
import { Role } from '@/lib/graphql/prisma-client';

export const Auth = (...roles: Role[]) =>
  applyDecorators(UseGuards(AuthGuard), UseGuards(new RoleGuard(roles)));
