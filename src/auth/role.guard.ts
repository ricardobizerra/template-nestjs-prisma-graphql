import { Role } from '@/lib/graphql/prisma-client';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly roles: Role[]) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.roles?.length) {
      return true;
    }

    const gqlCtx = GqlExecutionContext.create(context);
    const { user } = gqlCtx.getContext().req;

    return this.roles.some((role) => user.role?.includes(role));
  }
}
