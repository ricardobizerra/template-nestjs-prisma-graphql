import { Module } from '@nestjs/common';
import { UserController } from '@/user/presentation/http/user.controller';
import { UserService } from '@/user/user.service';
import { AuthModule } from '@/auth/auth.module';
import { ListUsersUseCase } from '@/user/application/use-cases/list-users.use-case';
import { GetMeUseCase } from '@/user/application/use-cases/get-me.use-case';
import { UpdateProfileUseCase } from '@/user/application/use-cases/update-profile.use-case';
import { UploadAvatarUseCase } from '@/user/application/use-cases/upload-avatar.use-case';
import { GetAuthMethodsUseCase } from '@/user/application/use-cases/get-auth-methods.use-case';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';
import { LinkOAuthAccountUseCase } from '@/user/application/use-cases/link-oauth-account.use-case';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    ListUsersUseCase,
    GetMeUseCase,
    UpdateProfileUseCase,
    UploadAvatarUseCase,
    GetAuthMethodsUseCase,
    CreateUserUseCase,
    LinkOAuthAccountUseCase,
  ],
  exports: [UserService],
  imports: [AuthModule, InfrastructureModule],
})
export class UserModule {}
