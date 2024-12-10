import { Role } from '@/lib/graphql/prisma-client';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserModel {
  @Field(() => ID, { nullable: false })
  id!: string;

  @Field(() => String, { nullable: false })
  email!: string;

  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => Role, { nullable: false })
  role!: Role;
}
