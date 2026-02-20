export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum OAuthProviderType {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: UserRole;
  password?: string | null;
  tokenVersion: number;
}

export interface AuthMethods {
  hasPassword: boolean;
  oauthProviders: OAuthProviderType[];
  availableProviders: OAuthProviderType[];
}
