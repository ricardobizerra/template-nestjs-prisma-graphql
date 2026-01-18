import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { genSalt, hash } from 'bcryptjs';
import { PaginatedFindMany } from '@/utils/paginated-find-many';
import { UserModel } from './models/user.model';

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
    orderBy: string;
    orderDirection: 'asc' | 'desc';
  };
}

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisSubscriptionService: RedisSubscriptionService,
  ) {}

  async findMany({ paginationArgs, searchArgs, ordenationArgs }: FindManyArgs) {
    // For REST, we select all user fields (excluding password)
    const queriedFields: (keyof UserModel)[] = ['id', 'email', 'name', 'role'];

    const paginatedFindMany = new PaginatedFindMany<User, UserModel>(
      this.prismaService,
      this.redisSubscriptionService,
      {
        selectObjectArgs: [queriedFields],
        paginationArgs,
        searchArgs,
        searchByFields: ['email', 'name'],
        ordenationArgs,
        tableName: 'User',
      },
    );

    const items = await paginatedFindMany.getItems();

    if (items.length === 0) {
      return {
        edges: [],
        pageInfo: paginatedFindMany.getPageInfo(),
      };
    }

    const edges = await paginatedFindMany.buildEdges(items);

    return {
      edges,
      pageInfo: paginatedFindMany.getPageInfo(),
    };
  }

  async findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: {
        email,
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
      where: {
        id,
      },
      data,
    });
  }
}
