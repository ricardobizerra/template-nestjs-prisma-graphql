import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignIn {
  @Field(() => String, { nullable: false })
  accessToken!: string;
}
