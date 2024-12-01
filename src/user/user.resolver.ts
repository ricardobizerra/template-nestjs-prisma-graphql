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
import { UserCreateInput, User } from 'src/graphql/prisma-client';
import { RedisService } from 'src/redis/redis.service';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  @Query(() => [User], { name: 'users' })
  async findMany(@Info() info: GraphQLResolveInfo) {
    const queriedFields = getQueriedFields(info, 'users');
    return this.userService.findMany(queriedFields);
  }

  @Query(() => User, { name: 'user' })
  async findOne(@Args('id', { type: () => ID! }) id: string) {
    return this.userService.findOne(id);
  }

  @Mutation(() => User, { name: 'createUser' })
  async create(@Args('data') data: UserCreateInput) {
    this.redisService.publish('userAdded', { userAdded: data });
    return this.userService.create(data);
  }

  @Subscription(() => User, {
    name: 'userAdded',
  })
  subscribeToUserAdded() {
    return this.redisService.asyncIterator('userAdded');
  }
}
