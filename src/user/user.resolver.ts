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
import { Role, UserCreateInput } from '@/lib/graphql/prisma-client';
import { RedisService } from '@/lib/redis/redis.service';
import { UserModel } from '@/user/models/user.model';
import { Auth } from '@/auth/auth.decorator';
import { CurrentUser } from './user.decorator';
import { AuthService } from '@/auth/auth.service';
import { SignIn } from '@/auth/models/sign-in.model';

@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}

  @Query(() => [UserModel], { name: 'users' })
  async findMany(@Info() info: GraphQLResolveInfo) {
    const queriedFields = getQueriedFields(info, 'users');
    return this.userService.findMany(queriedFields);
  }

  @Auth(Role.ADMIN)
  @Query(() => UserModel, { name: 'user' })
  async findOne(@CurrentUser() user: UserModel) {
    return this.userService.findOne(user.id);
  }

  @Mutation(() => SignIn, { name: 'createUser' })
  async create(@Args('data') data: UserCreateInput) {
    const emailAlreadyExists = await this.userService.findByEmail(data.email);

    if (!!emailAlreadyExists) {
      throw new GraphQLError('E-mail já cadastrado');
    }

    const createdUser = await this.userService.create(data);

    const returnObject = await this.authService.signIn(
      createdUser.email,
      createdUser.password,
      false,
    );

    return returnObject;
  }

  @Subscription(() => UserModel, {
    name: 'userAdded',
  })
  subscribeToUserAdded() {
    return this.redisService.asyncIterator('userAdded');
  }
}
