import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

export const roleEnum = pgEnum('Role', [Role.ADMIN, Role.USER]);
export const oauthProviderEnum = pgEnum('OAuthProvider', [
  OAuthProvider.GOOGLE,
  OAuthProvider.GITHUB,
]);

export const users = pgTable(
  'User',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    password: text('password'),
    name: text('name').notNull(),
    image: text('image'),
    role: roleEnum('role').notNull(),
    tokenVersion: integer('tokenVersion').default(0).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { precision: 3, mode: 'date' }),
  },
  (table) => {
    return {
      deletedAtIndex: index('User_deletedAt_idx').on(table.deletedAt),
    };
  },
);

export const oauthAccounts = pgTable(
  'OAuthAccount',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: oauthProviderEnum('provider').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { precision: 3, mode: 'date' }),
  },
  (table) => {
    return {
      providerProviderIdUnique: uniqueIndex(
        'OAuthAccount_provider_providerId_key',
      ).on(table.provider, table.providerId),
      userIdIndex: index('OAuthAccount_userId_idx').on(table.userId),
      deletedAtIndex: index('OAuthAccount_deletedAt_idx').on(table.deletedAt),
    };
  },
);

export const passwordResetTokens = pgTable(
  'PasswordResetToken',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    token: text('token').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userIdIndex: index('PasswordResetToken_userId_idx').on(table.userId),
    };
  },
);

export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  passwordResetTokens: many(passwordResetTokens),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);
