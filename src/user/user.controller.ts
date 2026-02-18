import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
  Req,
  HttpCode,
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
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@/lib/storage/storage.interface';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth } from '@/auth/auth.decorator';
import { CurrentUser } from './user.decorator';
import { AuthService } from '@/auth/auth.service';
import { UserModel } from './models/user.model';
import { AuthMethodsModel } from './models/auth-methods.model';
import { Role, User } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
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
    return this.userService.findMany({
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
        orderBy: (orderBy || 'id') as keyof User,
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
    return this.userService.findOne(user.id);
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
    return this.userService.update(user.id, updateUserDto);
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

    const key = `avatars/${user.id}-${Date.now()}`;
    const { url } = await this.storageProvider.upload(
      buffer,
      key,
      file.mimetype,
    );

    await this.userService.update(user.id, { image: url });

    return { url };
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
    return this.userService.getAuthMethods(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    const emailAlreadyExists = await this.userService.findByEmail(
      createUserDto.email,
    );

    if (emailAlreadyExists) {
      throw new HttpException('E-mail já cadastrado', HttpStatus.CONFLICT);
    }

    const createdUser = await this.userService.create({
      email: createUserDto.email,
      password: createUserDto.password,
      name: createUserDto.name,
      role: createUserDto.role,
    });

    const returnObject = await this.authService.signIn(
      createdUser.email,
      createUserDto.password,
    );

    return returnObject;
  }
}
