import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import { OAuthProviderType } from '@/shared/domain/user.types';

interface OAuthSignInInput {
  provider: OAuthProviderType;
  providerId: string;
  email: string;
  name: string;
  image?: string;
}

@Injectable()
export class OAuthSignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(input: OAuthSignInInput) {
    const user = await this.userRepository.findByOAuthAccount(
      input.provider,
      input.providerId,
    );

    if (user) {
      return user;
    }

    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      await this.userRepository.linkOAuthAccount(
        existingUser.id,
        input.provider,
        input.providerId,
      );

      return existingUser;
    }

    return this.userRepository.createWithOAuth({
      email: input.email,
      name: input.name,
      image: input.image,
      provider: input.provider,
      providerId: input.providerId,
    });
  }
}
