import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { UserRepository } from './user.repository';
import * as schema from '@/lib/drizzle/schema';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { genSalt, hash } from 'bcryptjs';
import { getAvailableOAuthProviders } from '@/auth/auth.constants';
import { KeysetPaginatedFindMany } from '@/utils/keyset-paginated-find-many';
import { UserModel } from './models/user.model';
import { OrderDirection } from '@/utils/args/ordenation.args';
import { eq, and, isNull, sql } from 'drizzle-orm';

type User = typeof schema.users.$inferSelect;

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
  role: schema.Role;
}

interface CreateWithOAuthInput {
  email: string;
  name: string;
  provider: schema.OAuthProvider;
  providerId: string;
  image?: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly userRepository: UserRepository,
    private readonly redisSubscriptionService: RedisSubscriptionService,
  ) {}

  async findMany({ paginationArgs, searchArgs, ordenationArgs }: FindManyArgs) {
    const selectFields: (keyof User)[] = ['id', 'email', 'name', 'role'];

    const paginator = new KeysetPaginatedFindMany<User>(this.drizzleService, {
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

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findUnique(id) as Promise<User | null>;
  }

  async getAuthMethods(userId: string) {
    const records = await this.drizzleService.db
      .select({
        id: schema.users.id,
        password: schema.users.password,
        provider: schema.oauthAccounts.provider,
      })
      .from(schema.users)
      .leftJoin(
        schema.oauthAccounts,
        and(
          eq(schema.users.id, schema.oauthAccounts.userId),
          isNull(schema.oauthAccounts.deletedAt),
        ),
      )
      .where(eq(schema.users.id, userId));

    if (records.length === 0) return null;

    // Aggregate the joined rows manually since we don't have Prisma's automatic joining
    const user = {
      password: records[0].password,
      oauthAccounts: records
        .filter((r) => r.provider)
        .map((r) => ({ provider: r.provider })),
    };

    if (!user) return null;

    return {
      hasPassword: !!user.password,
      oauthProviders: user.oauthAccounts.map((a) => a.provider),
      availableProviders: getAvailableOAuthProviders(),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email) as Promise<User | null>;
  }

  async findByOAuthAccount(
    provider: schema.OAuthProvider,
    providerId: string,
  ): Promise<User | null> {
    const records = await this.drizzleService.db
      .select({
        user: schema.users,
      })
      .from(schema.oauthAccounts)
      .innerJoin(schema.users, eq(schema.oauthAccounts.userId, schema.users.id))
      .where(
        and(
          eq(schema.oauthAccounts.provider, provider),
          eq(schema.oauthAccounts.providerId, providerId),
        ),
      )
      .limit(1);

    return (records[0]?.user as User) || null;
  }

  async linkOAuthAccount(
    userId: string,
    provider: schema.OAuthProvider,
    providerId: string,
  ) {
    const inserted = await this.drizzleService.db
      .insert(schema.oauthAccounts)
      .values({
        provider,
        providerId,
        userId,
      })
      .returning();
    return inserted[0];
  }

  async createWithOAuth(data: CreateWithOAuthInput): Promise<User> {
    return this.drizzleService.executeTransaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          email: data.email,
          name: data.name,
          image: data.image,
          role: schema.Role.USER,
        })
        .returning();

      await tx.insert(schema.oauthAccounts).values({
        provider: data.provider,
        providerId: data.providerId,
        userId: user.id,
      });

      return user;
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    const salt = await genSalt(10);
    const hashedPassword = await hash(data.password, salt);

    const [createdUser] = await this.drizzleService.db
      .insert(schema.users)
      .values({
        ...data,
        password: hashedPassword,
      })
      .returning();

    if (createdUser) {
      this.redisSubscriptionService.publish('userAdded', { userAdded: data });
    }

    return createdUser;
  }

  async revokeRefreshTokens(id: string) {
    const [user] = await this.drizzleService.db
      .update(schema.users)
      .set({ tokenVersion: sql`${schema.users.tokenVersion} + 1` })
      .where(eq(schema.users.id, id))
      .returning();

    return user;
  }

  async update(id: string, data: { name?: string; image?: string }) {
    const [user] = await this.drizzleService.db
      .update(schema.users)
      .set(data as any)
      .where(eq(schema.users.id, id))
      .returning();

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
