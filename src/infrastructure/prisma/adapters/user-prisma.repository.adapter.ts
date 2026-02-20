import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  CreateOAuthUserInput,
  CreateUserInput,
  FindUsersInput,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import {
  AuthMethods,
  OAuthProviderType,
  UserRecord,
} from '@/shared/domain/user.types';
import { KeysetPaginatedFindMany } from '@/utils/keyset-paginated-find-many';
import { OrderDirection } from '@/utils/args/ordenation.args';
import {
  toDomainOAuthProvider,
  toDomainRole,
  toPrismaOAuthProvider,
  toPrismaRole,
} from '@/shared/infrastructure/mappers/user-enum.mapper';
import { getAvailableOAuthProviders } from '@/auth/auth.constants';

@Injectable()
export class UserPrismaRepositoryAdapter implements UserRepositoryPort {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(input: FindUsersInput): Promise<unknown> {
    const paginator = new KeysetPaginatedFindMany<any>(this.prismaService, {
      tableName: 'User',
      paginationArgs: input.paginationArgs,
      searchArgs: input.searchArgs,
      searchByFields: ['email', 'name'],
      orderBy: input.ordenationArgs.orderBy,
      orderDirection:
        input.ordenationArgs.orderDirection === 'asc'
          ? OrderDirection.Asc
          : OrderDirection.Desc,
      selectFields: ['id', 'email', 'name', 'role'],
    });

    return paginator.findMany();
  }

  async findOne(id: string): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    return user ? this.toDomainUser(user) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    return user ? this.toDomainUser(user) : null;
  }

  async findByOAuthAccount(
    provider: OAuthProviderType,
    providerId: string,
  ): Promise<UserRecord | null> {
    const oauthAccount = await this.prismaService.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: toPrismaOAuthProvider(provider),
          providerId,
        },
      },
      include: { user: true },
    });

    return oauthAccount?.user ? this.toDomainUser(oauthAccount.user) : null;
  }

  async create(data: CreateUserInput): Promise<UserRecord> {
    const user = await this.prismaService.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: toPrismaRole(data.role),
      },
    });

    return this.toDomainUser(user);
  }

  async createWithOAuth(data: CreateOAuthUserInput): Promise<UserRecord> {
    const user = await this.prismaService.user.create({
      data: {
        email: data.email,
        name: data.name,
        image: data.image,
        role: 'USER',
        oauthAccounts: {
          create: {
            provider: toPrismaOAuthProvider(data.provider),
            providerId: data.providerId,
          },
        },
      },
    });

    return this.toDomainUser(user);
  }

  async linkOAuthAccount(
    userId: string,
    provider: OAuthProviderType,
    providerId: string,
  ): Promise<void> {
    await this.prismaService.oAuthAccount.create({
      data: {
        provider: toPrismaOAuthProvider(provider),
        providerId,
        userId,
      },
    });
  }

  async getAuthMethods(userId: string): Promise<AuthMethods | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        oauthAccounts: {
          where: { deletedAt: null },
          select: { provider: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      hasPassword: !!user.password,
      oauthProviders: user.oauthAccounts.map((a) =>
        toDomainOAuthProvider(a.provider),
      ),
      availableProviders: getAvailableOAuthProviders().map((provider) =>
        toDomainOAuthProvider(provider),
      ),
    };
  }

  async update(
    id: string,
    data: { name?: string; image?: string },
  ): Promise<UserRecord> {
    const user = await this.prismaService.user.update({
      where: { id },
      data,
    });

    return this.toDomainUser(user);
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async updatePasswordAndRevokeSessions(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
      },
    });
  }

  private toDomainUser(user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: any;
    password: string | null;
    tokenVersion: number;
  }): UserRecord {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: toDomainRole(user.role),
      password: user.password,
      tokenVersion: user.tokenVersion,
    };
  }
}
