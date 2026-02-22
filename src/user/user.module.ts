import { Global, Module, forwardRef } from '@nestjs/common';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { UserRepository } from '@/user/user.repository';
import { AuthModule } from '@/auth/auth.module';

@Global()
@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
  imports: [forwardRef(() => AuthModule)],
})
export class UserModule {}
