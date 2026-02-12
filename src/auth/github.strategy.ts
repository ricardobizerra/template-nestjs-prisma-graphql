import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { UserService } from '@/user/user.service';
import { OAuthProvider } from '@prisma/client';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID'),
      clientSecret: configService.get('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: any) => void,
  ): Promise<void> {
    const { id: providerId, emails, displayName, username } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('GitHub account has no email'), undefined);
    }

    try {
      // Try to find user by OAuth account
      let user = await this.userService.findByOAuthAccount(
        OAuthProvider.GITHUB,
        providerId,
      );

      if (!user) {
        // Check if user exists with this email
        const existingUser = await this.userService.findByEmail(email);

        if (existingUser) {
          // Link OAuth account to existing user
          await this.userService.linkOAuthAccount(
            existingUser.id,
            OAuthProvider.GITHUB,
            providerId,
          );
          user = existingUser;
        } else {
          // Create new user with OAuth account
          user = await this.userService.createWithOAuth({
            email,
            name: displayName || username || email.split('@')[0],
            provider: OAuthProvider.GITHUB,
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
