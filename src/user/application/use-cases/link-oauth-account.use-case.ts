import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import { OAuthProviderType } from '@/shared/domain/user.types';

@Injectable()
export class LinkOAuthAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  execute(userId: string, provider: OAuthProviderType, providerId: string) {
    return this.userRepository.linkOAuthAccount(userId, provider, providerId);
  }
}
