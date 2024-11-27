import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  constructor() {}

  @Query(() => String)
  health(): string {
    return 'ok';
  }
}
