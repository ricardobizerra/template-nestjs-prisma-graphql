import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserCreateInput } from 'src/graphql/prisma-client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { selectObject } from 'src/utils/select-object';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findMany(queriedFields: string[]) {
    const select = selectObject<User>(queriedFields);

    return this.prismaService.user.findMany({
      select,
    });
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

  async create(data: UserCreateInput) {
    const createdUser = await this.prismaService.user.create({
      data,
    });

    if (!!createdUser) {
      this.redisService.publish('userAdded', { userAdded: data });
    }

    return createdUser;
  }

  async update(id: string, data: UserCreateInput) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }
}
