import { Role } from '@/lib/graphql/prisma-client';
import { Ordenation } from '@/utils/args/ordenation.args';
import { ArgsType, Field, ID, ObjectType } from '@nestjs/graphql';

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

enum OrderBy {
  id = 'id',
  email = 'email',
  name = 'name',
  role = 'role',
}

@ArgsType()
export class OrdenationUserArgs extends Ordenation(UserModel, OrderBy) {}
