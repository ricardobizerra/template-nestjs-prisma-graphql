import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { UserService } from '@/user/user.service';
import { OAuthProvider } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
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
      // Try to find user by OAuth account
      let user = await this.userService.findByOAuthAccount(
        OAuthProvider.GOOGLE,
        providerId,
      );

      if (!user) {
        // Check if user exists with this email
        const existingUser = await this.userService.findByEmail(email);

        if (existingUser) {
          // Link OAuth account to existing user
          await this.userService.linkOAuthAccount(
            existingUser.id,
            OAuthProvider.GOOGLE,
            providerId,
          );
          user = existingUser;
        } else {
          // Create new user with OAuth account
          user = await this.userService.createWithOAuth({
            email,
            name: displayName || email.split('@')[0],
            image,
            provider: OAuthProvider.GOOGLE,
            providerId,
          });
        }
      }

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
