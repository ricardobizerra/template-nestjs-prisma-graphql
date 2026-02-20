import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  DOMAIN_EVENT_PUBLISHER_PORT,
  DomainEventPublisherPort,
} from '@/shared/application/ports/domain-event-publisher.port';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '@/shared/application/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import { UserRole } from '@/shared/domain/user.types';

interface CreateUserCommand {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(DOMAIN_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(command: CreateUserCommand) {
    const existing = await this.userRepository.findByEmail(command.email);

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await this.passwordHasher.hash(command.password);

    const user = await this.userRepository.create({
      email: command.email,
      password: hashedPassword,
      name: command.name,
      role: command.role,
    });

    await this.eventPublisher.publishUserCreated({
      email: command.email,
      name: command.name,
      role: command.role,
    });

    return user;
  }
}
