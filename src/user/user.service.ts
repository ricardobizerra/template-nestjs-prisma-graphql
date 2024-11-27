import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserCreateInput } from 'src/graphql/prisma-client/user/user-create.input';
import { PrismaService } from 'src/prisma/prisma.service';
import { selectObject } from 'src/utils/select-object';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async create(data: UserCreateInput) {
    return this.prismaService.user.create({
      data,
    });
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
