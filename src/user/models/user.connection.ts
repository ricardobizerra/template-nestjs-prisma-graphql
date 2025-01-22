import { Connection } from '@/utils/models/connection.model';
import { UserModel } from './user.model';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserConnection extends Connection(UserModel) {}
