import { Injectable } from '@nestjs/common';
import { OAuthProvider, User } from '@prisma/client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { genSalt, hash } from 'bcryptjs';
import { getAvailableOAuthProviders } from '@/auth/auth.constants';
import { KeysetPaginatedFindMany } from '@/utils/keyset-paginated-find-many';
import { UserModel } from './models/user.model';
import { OrderDirection } from '@/utils/args/ordenation.args';

interface FindManyArgs {
  paginationArgs: {
    first: number | null;
    after: string | null;
    before: string | null;
    last: number | null;
  };
  searchArgs: {
    search: string;
  };
  ordenationArgs: {
    orderBy: keyof User;
    orderDirection: 'asc' | 'desc';
  };
}

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

interface CreateWithOAuthInput {
  email: string;
  name: string;
  provider: OAuthProvider;
  providerId: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisSubscriptionService: RedisSubscriptionService,
  ) {}

  async findMany({ paginationArgs, searchArgs, ordenationArgs }: FindManyArgs) {
    const selectFields: (keyof User)[] = ['id', 'email', 'name', 'role'];

    const paginator = new KeysetPaginatedFindMany<User>(this.prismaService, {
      tableName: 'User',
      paginationArgs,
      searchArgs,
      searchByFields: ['email', 'name'],
      orderBy: ordenationArgs.orderBy,
      orderDirection:
        ordenationArgs.orderDirection === 'asc'
          ? OrderDirection.Asc
          : OrderDirection.Desc,
      selectFields,
    });

    return paginator.findMany();
  }

  async findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  async getAuthMethods(userId: string) {
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

    if (!user) return null;

    return {
      hasPassword: !!user.password,
      oauthProviders: user.oauthAccounts.map((a) => a.provider),
      availableProviders: getAvailableOAuthProviders(),
    };
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  async findByOAuthAccount(provider: OAuthProvider, providerId: string) {
    const oauthAccount = await this.prismaService.oAuthAccount.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
      include: { user: true },
    });

    return oauthAccount?.user || null;
  }

  async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    providerId: string,
  ) {
    return this.prismaService.oAuthAccount.create({
      data: {
        provider,
        providerId,
        userId,
      },
    });
  }

  async createWithOAuth(data: CreateWithOAuthInput) {
    return this.prismaService.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: 'USER',
        oauthAccounts: {
          create: {
            provider: data.provider,
            providerId: data.providerId,
          },
        },
      },
    });
  }

  async create(data: CreateUserInput) {
    const salt = await genSalt(10);
    const hashedPassword = await hash(data.password, salt);

    const createdUser = await this.prismaService.user.create({
      data: { ...data, password: hashedPassword },
    });

    if (createdUser) {
      this.redisSubscriptionService.publish('userAdded', { userAdded: data });
    }

    return createdUser;
  }

  async update(id: string, data: CreateUserInput) {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
