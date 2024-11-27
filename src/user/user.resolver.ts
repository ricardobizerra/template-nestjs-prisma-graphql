import { Args, ID, Info, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from 'src/graphql/prisma-client/user/user.model';
import { GraphQLResolveInfo } from 'graphql';
import { getQueriedFields } from 'src/utils/get-queried-fields';

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
}
