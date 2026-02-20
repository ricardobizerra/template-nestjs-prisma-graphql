import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '@/shared/application/ports/password-hasher.port';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: string;
  };
}

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(SESSION_TOKEN_PORT)
    private readonly sessionTokenPort: SessionTokenPort,
  ) {}

  async execute(email: string, password: string): Promise<SignInResult> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses OAuth login. Please sign in with Google.',
      );
    }

    const passwordMatches = await this.passwordHasher.compare(
      password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException();
    }

    return {
      accessToken: this.sessionTokenPort.generateAccessToken(user),
      refreshToken: this.sessionTokenPort.generateRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      },
    };
  }
}
