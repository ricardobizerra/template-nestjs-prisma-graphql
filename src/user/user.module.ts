import { Global, Module } from '@nestjs/common';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { AuthModule } from '@/auth/auth.module';

@Global()
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
  imports: [AuthModule],
})
export class UserModule {}
