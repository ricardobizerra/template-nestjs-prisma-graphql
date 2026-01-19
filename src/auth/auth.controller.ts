import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res() res: Response) {
    const result = await this.authService.signIn(
      signInDto.username,
      signInDto.password,
    );

    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: this.configService.get('JWT_EXPIRES_IN_SECONDS') * 1000,
    });

    return res.json(result);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite:
        this.configService.get('NODE_ENV') === 'production' ? 'strict' : 'lax',
    });

    return res.json({ message: 'Logged out successfully' });
  }
}
