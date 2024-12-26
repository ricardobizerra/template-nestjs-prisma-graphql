import { Global, Module } from '@nestjs/common';
import { UserResolver } from '@/user/user.resolver';
import { UserService } from '@/user/user.service';
import { AuthModule } from '@/auth/auth.module';

@Global()
@Module({
  providers: [UserResolver, UserService],
  exports: [UserService],
  imports: [AuthModule],
})
export class UserModule {}
