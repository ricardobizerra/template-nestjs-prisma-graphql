# Auth + User Clean Architecture (Hexagonal) Design

## Context

`auth` and `user` had direct coupling through service-to-service calls, `forwardRef`, and direct infrastructure usage (`PrismaService`, queue, storage) across feature boundaries. This increased fragility and made dependency direction inconsistent.

## Decision

Adopt a pragmatic hexagonal structure in `auth` and `user`, with centralized infrastructure modules (Proposal 3):

- `domain`: business types and value-level contracts.
- `application`: use-cases and port interfaces.
- `infrastructure`: top-level centralized adapters/modules for Prisma, queue, storage, config, JWT, bcrypt, redis.
- `presentation`: controllers and passport strategies.

Nest modules remain composition roots.

## Implemented Changes

### Auth

- Added use-cases:
  - `SignInUseCase`
  - `RefreshSessionUseCase`
  - `RequestPasswordResetUseCase`
  - `ResetPasswordUseCase`
  - `OAuthSignInUseCase`
  - `RevokeAllSessionsUseCase`
  - `GetCurrentUserUseCase`
- Moved HTTP controller to `src/auth/presentation/http/auth.controller.ts`.
- Moved strategies to `src/auth/presentation/strategies/*`.
- Added `PasswordResetTokenPrismaRepositoryAdapter`.
- Kept `AuthService` as a compatibility facade delegating to use-cases/ports.

### User

- Added use-cases:
  - `CreateUserUseCase`
  - `ListUsersUseCase`
  - `GetMeUseCase`
  - `UpdateProfileUseCase`
  - `GetAuthMethodsUseCase`
  - `UploadAvatarUseCase`
  - `LinkOAuthAccountUseCase`
- Moved HTTP controller to `src/user/presentation/http/user.controller.ts`.
- Added `UserPrismaRepositoryAdapter`.
- Kept `UserService` as a compatibility facade.

### Shared ports/adapters

- Ports:
  - `UserRepositoryPort`
  - `PasswordResetTokenRepositoryPort`
  - `SessionTokenPort`
  - `PasswordHasherPort`
  - `MailQueuePort`
  - `StoragePort`
  - `DomainEventPublisherPort`
  - `ConfigPort`
- Adapters moved under `src/infrastructure/*/adapters`:
  - `AppConfigAdapter`
  - `JwtSessionTokenAdapter`
  - `BcryptPasswordHasherAdapter`
  - `BullMqMailQueueAdapter`
  - `StorageAdapter`
  - `RedisDomainEventPublisherAdapter`
- Added `AuthCookieService` for token cookie policy reuse.

## Compatibility and API

- Routes preserved.
- OAuth callback redirects preserved.
- Cookie names/paths preserved:
  - `accessToken` at `/`
  - `refreshToken` at `/auth`
- `POST /users` aligned to `{ user }` response with token cookies.

## Module Composition

- Removed `forwardRef` between `auth` and `user`.
- Removed `@Global()` from `UserModule`.
- Added centralized modules under `src/infrastructure`:
  - `config/config-adapters.module.ts`
  - `security/security.module.ts`
  - `prisma/prisma-repositories.module.ts`
  - `messaging/messaging.module.ts`
  - `storage/storage-adapters.module.ts`
  - `infrastructure.module.ts` (aggregator)
- `AuthModule` and `UserModule` now import `InfrastructureModule` instead of binding adapters directly.
- `src/lib/*` remains as technical clients (drivers) used by infrastructure adapters.

## Verification

- Unit test suite updated and passing.
- `yarn test` succeeds.

## Follow-up

- Expand the same pattern to other feature areas.
- Tighten static boundary rules incrementally (including custom lint/import checks per layer).
