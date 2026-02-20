import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { Auth } from '@/auth/auth.decorator';
import { CurrentUser } from '@/user/user.decorator';
import { UserModel } from '@/user/models/user.model';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UpdateUserDto } from '@/user/dto/update-user.dto';
import { AuthMethodsModel } from '@/user/models/auth-methods.model';
import { ListUsersUseCase } from '@/user/application/use-cases/list-users.use-case';
import { GetMeUseCase } from '@/user/application/use-cases/get-me.use-case';
import { UpdateProfileUseCase } from '@/user/application/use-cases/update-profile.use-case';
import { UploadAvatarUseCase } from '@/user/application/use-cases/upload-avatar.use-case';
import { GetAuthMethodsUseCase } from '@/user/application/use-cases/get-auth-methods.use-case';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';
import { UserRole } from '@/shared/domain/user.types';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly getAuthMethodsUseCase: GetAuthMethodsUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Find many users with keyset pagination' })
  @ApiResponse({ status: 200, description: 'Return paginated users' })
  async findMany(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
    @Query('last') last?: string,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    return this.listUsersUseCase.execute({
      paginationArgs: {
        first: first ? parseInt(first, 10) : null,
        after: after || null,
        before: before || null,
        last: last ? parseInt(last, 10) : null,
      },
      searchArgs: {
        search: search || '',
      },
      ordenationArgs: {
        orderBy: orderBy || 'id',
        orderDirection: orderDirection || 'asc',
      },
    });
  }

  @Auth()
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Return current user profile',
    type: UserModel,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@CurrentUser() user: UserModel) {
    return this.getMeUseCase.execute(user.id);
  }

  @Auth()
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserModel,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(
    @CurrentUser() user: UserModel,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.updateProfileUseCase.execute(user.id, updateUserDto);
  }

  @Post('avatar')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @CurrentUser() user: UserModel,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();

    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Only JPEG, PNG and WebP are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const buffer = await file.toBuffer();

    return this.uploadAvatarUseCase.execute({
      userId: user.id,
      buffer,
      mimeType: file.mimetype,
    });
  }

  @Auth()
  @Get('me/auth-methods')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user authentication methods' })
  @ApiResponse({
    status: 200,
    description: 'Return connected authentication methods',
    type: AuthMethodsModel,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAuthMethods(@CurrentUser() user: UserModel) {
    return this.getAuthMethodsUseCase.execute(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async create(@Body() createUserDto: CreateUserDto, @Res() res: FastifyReply) {
    const createdUser = await this.createUserUseCase.execute({
      email: createUserDto.email,
      password: createUserDto.password,
      name: createUserDto.name,
      role: createUserDto.role as UserRole,
    });

    const signedIn = await this.signInUseCase.execute(
      createdUser.email,
      createUserDto.password,
    );

    this.authCookieService.setTokenCookies(
      res,
      signedIn.accessToken,
      signedIn.refreshToken,
    );

    return res.send({ user: signedIn.user });
  }
}
