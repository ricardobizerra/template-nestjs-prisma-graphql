import { ApiProperty } from '@nestjs/swagger';
import { OAuthProvider } from '@/lib/drizzle/schema';

export class AuthMethodsModel {
  @ApiProperty({
    example: true,
    description: 'Whether the user has a password set',
  })
  hasPassword: boolean;

  @ApiProperty({
    enum: OAuthProvider,
    isArray: true,
    example: ['GOOGLE'],
    description: 'List of connected OAuth provider names',
  })
  oauthProviders: OAuthProvider[];

  @ApiProperty({
    enum: OAuthProvider,
    isArray: true,
    example: ['GOOGLE'],
    description:
      'List of all OAuth providers available for connection in this instance',
  })
  availableProviders: OAuthProvider[];
}
