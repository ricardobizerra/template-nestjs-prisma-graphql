import { Inject, Injectable } from '@nestjs/common';
import {
  FindUsersInput,
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  execute(input: FindUsersInput) {
    return this.userRepository.findMany(input);
  }
}
