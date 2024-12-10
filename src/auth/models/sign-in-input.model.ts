import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AuthSignInInput {
  @Field(() => String, { nullable: false })
  username!: string;

  @Field(() => String, { nullable: false })
  password!: string;
}
