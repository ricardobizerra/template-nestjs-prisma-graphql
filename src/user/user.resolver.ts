import {
  Args,
  ID,
  Info,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { UserService } from '@/user/user.service';
import { GraphQLError, GraphQLResolveInfo } from 'graphql';
import { getQueriedFields } from '@/utils/get-queried-fields';
import { UserCreateInput } from '@/graphql/prisma-client';
import { RedisService } from '@/redis/redis.service';
import { UserModel } from '@/user/models/user.model';

@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  @Query(() => [UserModel], { name: 'users' })
  async findMany(@Info() info: GraphQLResolveInfo) {
    const queriedFields = getQueriedFields(info, 'users');
    return this.userService.findMany(queriedFields);
  }

  @Query(() => UserModel, { name: 'user' })
  async findOne(@Args('id', { type: () => ID! }) id: string) {
    return this.userService.findOne(id);
  }

  @Mutation(() => UserModel, { name: 'createUser' })
  async create(@Args('data') data: UserCreateInput) {
    const emailAlreadyExists = await this.userService.findByEmail(data.email);

    if (!!emailAlreadyExists) {
      throw new GraphQLError('E-mail já cadastrado');
    }

    return this.userService.create(data);
  }

  @Subscription(() => UserModel, {
    name: 'userAdded',
  })
  subscribeToUserAdded() {
    return this.redisService.asyncIterator('userAdded');
  }
}
