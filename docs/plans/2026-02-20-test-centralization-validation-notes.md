# Test Centralization Validation Notes

## Scope
Validation notes for moving test files from co-located `src/**` specs into centralized `test/unit/**` and `test/integration/**` directories.

## Executed Commands

### 1. Unit/default suite
- Command: `yarn test`
- Result: PASS
- Summary: `24` test files, `117` tests passed.

### 2. E2E suite
- Command: `yarn test:e2e`
- Result: FAIL (environmental)
- Observed failure:
  - DNS/infra resolution errors for Redis host (`rblf-redis`): `getaddrinfo EAI_AGAIN` / `ENOTFOUND`.
  - This is an environment dependency issue, not test discovery/path migration.

### 3. Coverage run
- Command: `yarn test:cov`
- Result: FAIL (filesystem permissions)
- Observed failure:
  - `EACCES: permission denied, rmdir .../coverage/app`
  - This is a pre-existing local FS permission issue in `coverage/`, unrelated to test file relocation.

## Discovery Expectations Verified
- Specs under `src/**`: `0`
- Unit specs under `test/unit/**`: `24`
- E2E specs under `test/integration/**`: `2`

## Notes
- `vitest.config.ts` now targets centralized non-e2e tests and explicitly excludes `test/integration/**/*.e2e-spec.ts`.
- `vitest.config.e2e.ts` now targets `test/integration/**/*.e2e-spec.ts`.
