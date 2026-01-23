---
description: Ensuring complete Swagger documentation for API endpoints
---

# Swagger Documentation Workflow

This workflow ensures that every API endpoint and data model is perfectly documented, providing a first-class developer experience for anyone using the API.

## 1. Controller Standardization

Every controller must follow these decoration rules to group and identify endpoints correctly:

- **Class Level**:
  - `@ApiTags('Users')` - Groups endpoints under a clear category.
  - `@ApiBearerAuth()` - If the controller (or most of its routes) requires JWT authentication.
  - `@ApiExtraModels(OtherModel)` - If you are using models that aren't directly returned by a method.

- **Method Level**:
  - `@ApiOperation({ summary: 'Short action description', description: 'Longer details if needed' })`
  - `@ApiResponse({ status: 200, description: 'Success message', type: ResponseModel })`
  - `@ApiResponse({ status: 201, description: 'Created successfully', type: ResponseModel })`
  - `@ApiResponse({ status: 400, description: 'Validation error (Payload or Params)' })`
  - `@ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })`
  - `@ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions or CSRF failure' })`
  - `@ApiResponse({ status: 404, description: 'Not Found - Resource does not exist' })`
  - `@ApiResponse({ status: 409, description: 'Conflict - Duplicate record or state mismatch' })`

## 2. Data Transfer Objects (DTOs) & Models

Documentation doesn't stop at the endpoint. The "Schema" tab in Swagger must be rich and usable:

- **Every property** must have `@ApiProperty()` or `@ApiPropertyOptional()`.
- **Always include an `example`**: This allows developers to test the API instantly from the UI.
- **Provide `description`**: Especially for fields with complex logic or formats.
- **Validation decorators**: Swagger automatically picks up many `class-validator` rules, but ensure they are present.

### Example DTO:
```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com', description: 'The unique email of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2 })
  @IsString()
  name: string;
}
```

## 3. Automation and Verification

// turbo
### Run the app in development to verify the UI
1. Start the server: `yarn start:dev`
2. Navigate to: `http://localhost:3333/api/docs`
3. Audit the newly added endpoints for consistency.

// turbo
### Run tests to ensure no decorators caused runtime errors
`docker compose exec api yarn test`
