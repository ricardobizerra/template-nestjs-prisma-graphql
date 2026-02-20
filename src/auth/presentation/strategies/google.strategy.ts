import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { OAuthSignInUseCase } from '@/auth/application/use-cases/oauth-sign-in.use-case';
import { OAuthProviderType } from '@/shared/domain/user.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly oauthSignInUseCase: OAuthSignInUseCase,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id: providerId, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;
    const image = photos?.[0]?.value;

    if (!email) {
      return done(new Error('Google account has no email'), undefined);
    }

    try {
      const user = await this.oauthSignInUseCase.execute({
        provider: OAuthProviderType.GOOGLE,
        providerId,
        email,
        name: displayName || email.split('@')[0],
        image,
      });

      done(null, user as any);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
