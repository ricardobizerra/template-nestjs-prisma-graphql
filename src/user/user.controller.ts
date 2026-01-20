import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from '@/auth/auth.decorator';
import { CurrentUser } from './user.decorator';
import { AuthService } from '@/auth/auth.service';
import { UserModel } from './models/user.model';
import { Role } from '@prisma/client';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Get()
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
        orderBy: orderBy || 'id',
        orderDirection: orderDirection || 'asc',
      },
    });
  }

  @Auth(Role.ADMIN)
  @Get('me')
  async findOne(@CurrentUser() user: UserModel) {
    return this.userService.findOne(user.id);
  }

  @Post()
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
