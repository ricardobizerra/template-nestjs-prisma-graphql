import { Args, ID, Info, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { GraphQLResolveInfo } from 'graphql';
import { getQueriedFields } from 'src/utils/get-queried-fields';
import { UserCreateInput, User } from 'src/graphql/prisma-client';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

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
    return this.userService.create(data);
  }
}
