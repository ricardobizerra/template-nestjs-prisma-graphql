import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UserModel } from '@/user/models/user.model';
import { AuthSignInInput } from './models/sign-in-input.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => UserModel, { name: 'authSignIn' })
  async signIn(@Args('data') data: AuthSignInInput) {
    return this.authService.signIn(data.username, data.password);
  }
}
