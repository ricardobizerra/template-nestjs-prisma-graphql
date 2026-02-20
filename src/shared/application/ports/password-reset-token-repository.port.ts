export interface PasswordResetTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
}

export const PASSWORD_RESET_TOKEN_REPOSITORY_PORT = Symbol(
  'PASSWORD_RESET_TOKEN_REPOSITORY_PORT',
);

export interface PasswordResetTokenRepositoryPort {
  deleteByUserId(userId: string): Promise<void>;
  create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;
  findValidTokensWithUser(): Promise<
    Array<PasswordResetTokenRecord & { user: { id: string } }>
  >;
  deleteById(id: string): Promise<void>;
}
