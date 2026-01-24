---
name: test-driven-development
description: Skill for ensuring that all new code and feature implementations are accompanied by appropriate unit and integration tests, maintaining high coverage.
---

# Test-Driven Development (TDD) Skill

This skill ensures that code quality is maintained by enforcing testing standards across all new implementations.

## Core Principles
1. **No Code without Tests**: Every new feature, service, or bug fix must have a corresponding test file.
2. **Coverage First**: Run coverage reports during implementation to identify untested branches or functions.
3. **Mock Wisely**: Use consistent mocking strategies (e.g., class-based mocks for external services) to avoid flaky tests.

## Instructions for the Agent
1. **Identify Changes**: Before completing any task, check for new or modified logic in the codebase.
2. **Locate Spec Files**: For every file `path/to/module.ts`, ensure `path/to/module.spec.ts` exists and is updated.
3. **Verify Coverage**: 
   - Run `docker compose exec api npm run test:cov` (or the project's coverage command).
   - Analysis of the coverage report is mandatory. Do not proceed if global coverage drops or if the new code has <80% coverage.
4. **Fix Regressions**: If any change breaks existing tests, priority must be given to fixing them before continuing with new features.

## Examples
- **New Service**: If creating `src/user/user.service.ts`, immediately create `src/user/user.service.spec.ts` with mocks for `PrismaService`.
- **Bug Fix**: If fixing a validation error in a filter, add a test case to the existing filter spec that reproduces the bug before and verifies the fix after.
