import { Module } from '@nestjs/common';
import { UserResolver } from '@/user/user.resolver';
import { UserService } from '@/user/user.service';

@Module({
  providers: [UserResolver, UserService],
})
export class UserModule {}
