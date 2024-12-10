import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthSignInInput } from './models/sign-in-input.model';
import { SignIn } from './models/sign-in.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => SignIn, { name: 'authSignIn' })
  async signIn(@Args('data') data: AuthSignInInput) {
    return this.authService.signIn(data.username, data.password);
  }
}
