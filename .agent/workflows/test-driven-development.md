---
description: How to implement new features with test coverage
---

# Feature Implementation with Tests

Use this workflow whenever you create new code or modify existing functionality to ensure the high coverage standard is maintained.

1. **Analyze Requirements**: 
   - Identify the core logic and edge cases for the new feature.
   - Outline the necessary tests in your `implementation_plan.md`.

2. **Implement Code**: 
   - Write the implementation code.
   - Keep files small and modular to simplify testing.

3. **Generate Tests**: 
   - Create a `.spec.ts` file for every new `.ts` file.
   - Import necessary mocks (e.g., `PrismaService` mock, `RedisService` mock).
   - Use `describe` blocks to group functionality and `it` or `test` for individual cases.

// turbo
4. **Run Verification**: 
   - Execute the tests: `docker compose exec api npm run test`.
   - Check coverage: `docker compose exec api npm run test:cov`.

5. **Iterate**:
   - If coverage is below 80% for the new module, add more tests for uncovered branches.
   - Fix any failing existing tests.

6. **Finalize**:
   - Provide the coverage report in your [walkthrough.md](file:///path/to/walkthrough.md).
