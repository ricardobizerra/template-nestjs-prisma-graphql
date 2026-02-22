import { Role } from '@/lib/drizzle/schema';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly roles: Role[]) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    return this.roles.some((role) => user?.role?.includes(role));
  }
}
