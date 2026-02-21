import { Inject, Injectable } from '@nestjs/common';
import {
  CreateUserInput,
  FindUsersInput,
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import { OAuthProvider } from '@prisma/client';
import { toDomainOAuthProvider } from '@/shared/infrastructure/mappers/user-enum.mapper';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';
import { UserRole } from '@/shared/domain/user.types';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  findMany(input: FindUsersInput) {
    return this.userRepository.findMany(input);
  }

  findOne(id: string) {
    return this.userRepository.findOne(id);
  }

  getAuthMethods(userId: string) {
    return this.userRepository.getAuthMethods(userId);
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findByOAuthAccount(provider: OAuthProvider, providerId: string) {
    return this.userRepository.findByOAuthAccount(
      toDomainOAuthProvider(provider),
      providerId,
    );
  }

  async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    providerId: string,
  ) {
    await this.userRepository.linkOAuthAccount(
      userId,
      toDomainOAuthProvider(provider),
      providerId,
    );
  }

  createWithOAuth(data: {
    email: string;
    name: string;
    provider: OAuthProvider;
    providerId: string;
    image?: string;
  }) {
    return this.userRepository.createWithOAuth({
      ...data,
      provider: toDomainOAuthProvider(data.provider),
    });
  }

  create(data: CreateUserInput) {
    return this.createUserUseCase.execute({
      ...data,
      role: data.role as UserRole,
    });
  }

  update(id: string, data: { name?: string; image?: string }) {
    return this.userRepository.update(id, data);
  }
}
