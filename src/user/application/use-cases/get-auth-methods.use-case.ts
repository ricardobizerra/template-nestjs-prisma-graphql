import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';

@Injectable()
export class GetAuthMethodsUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  execute(userId: string) {
    return this.userRepository.getAuthMethods(userId);
  }
}
