import {
  Args,
  ID,
  Info,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { UserService } from './user.service';
import { GraphQLResolveInfo } from 'graphql';
import { getQueriedFields } from 'src/utils/get-queried-fields';
import { UserCreateInput } from 'src/graphql/prisma-client';
import { RedisService } from 'src/redis/redis.service';
import { UserModel } from './model/user.model';

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
    this.redisService.publish('userAdded', { userAdded: data });
    return this.userService.create(data);
  }

  @Subscription(() => UserModel, {
    name: 'userAdded',
  })
  subscribeToUserAdded() {
    return this.redisService.asyncIterator('userAdded');
  }
}
