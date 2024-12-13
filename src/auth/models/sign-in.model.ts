import { UserModel } from '@/user/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignIn {
  @Field(() => String, { nullable: false })
  accessToken!: string;

  @Field(() => UserModel, { nullable: true })
  user: UserModel;
}
