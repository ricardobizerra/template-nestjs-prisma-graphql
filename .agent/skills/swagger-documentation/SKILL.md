---
name: swagger-documentation
description: Skill for ensuring comprehensive Swagger API documentation
---

# Swagger Documentation Skill

This skill provides the necessary rules and examples to maintain high-quality API documentation using NestJS Swagger decorators.

## Guidelines

### 1. Controller Decoration
Always apply `@ApiTags` at the class level. Each endpoint should have:
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: ..., description: '...', type: ... })`

### 2. DTO Documentation
All public properties in DTOs used for input or output must have `@ApiProperty` with an `example`.

### 3. Standards
- **Summaries**: Use active verbs (e.g., "Creates", "Retrieves").
- **Examples**: Use realistic data (e.g., "jane.doe@example.com").
- **Error Responses**: Document at least 400 (Validation), 401 (Unauthorized), and 403 (CSRF/Forbidden).

## Usage
Refer to this skill whenever creating new API endpoints or modifying existing data models to ensure the Swagger UI remains a truthful and helpful representation of the API.
