import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { OAuthSignInUseCase } from '@/auth/application/use-cases/oauth-sign-in.use-case';
import { OAuthProviderType } from '@/shared/domain/user.types';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly oauthSignInUseCase: OAuthSignInUseCase,
  ) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID'),
      clientSecret: configService.get('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: any) => void,
  ): Promise<void> {
    const { id: providerId, emails, displayName, username, photos } = profile;
    const email = emails?.[0]?.value;
    const image = photos?.[0]?.value;

    if (!email) {
      return done(new Error('GitHub account has no email'), undefined);
    }

    try {
      const user = await this.oauthSignInUseCase.execute({
        provider: OAuthProviderType.GITHUB,
        providerId,
        email,
        name: displayName || username || email.split('@')[0],
        image,
      });

      done(null, user as any);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
