import {
  AuthMethods,
  OAuthProviderType,
  UserRecord,
  UserRole,
} from '@/shared/domain/user.types';

export interface FindUsersInput {
  paginationArgs: {
    first: number | null;
    after: string | null;
    before: string | null;
    last: number | null;
  };
  searchArgs: {
    search: string;
  };
  ordenationArgs: {
    orderBy: string;
    orderDirection: 'asc' | 'desc';
  };
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface CreateOAuthUserInput {
  email: string;
  name: string;
  provider: OAuthProviderType;
  providerId: string;
  image?: string;
}

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');

export interface UserRepositoryPort {
  findMany(input: FindUsersInput): Promise<unknown>;
  findOne(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByOAuthAccount(
    provider: OAuthProviderType,
    providerId: string,
  ): Promise<UserRecord | null>;
  create(data: CreateUserInput): Promise<UserRecord>;
  createWithOAuth(data: CreateOAuthUserInput): Promise<UserRecord>;
  linkOAuthAccount(
    userId: string,
    provider: OAuthProviderType,
    providerId: string,
  ): Promise<void>;
  getAuthMethods(userId: string): Promise<AuthMethods | null>;
  update(
    id: string,
    data: { name?: string; image?: string },
  ): Promise<UserRecord>;
  incrementTokenVersion(userId: string): Promise<void>;
  updatePasswordAndRevokeSessions(
    userId: string,
    hashedPassword: string,
  ): Promise<void>;
}
