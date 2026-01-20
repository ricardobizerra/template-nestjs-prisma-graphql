import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  private setCookieAndRedirect(res: FastifyReply, user: User) {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const accessToken = this.authService.generateToken(user);

    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: this.configService.get('JWT_EXPIRES_IN_SECONDS'),
      path: '/',
    });

    return res;
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res() res: FastifyReply) {
    const result = await this.authService.signIn(
      signInDto.username,
      signInDto.password,
    );

    this.setCookieAndRedirect(res, result.user as User);

    return res.send(result);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Res() res: FastifyReply) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite:
        this.configService.get('NODE_ENV') === 'production' ? 'strict' : 'lax',
      path: '/',
    });

    return res.send({ message: 'Logged out successfully' });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);

    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return { message: 'Password has been reset successfully' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: FastifyRequest & { user: User },
    @Res() res: FastifyReply,
  ) {
    const user = req.user;

    this.setCookieAndRedirect(res, user);

    const frontendUrl = this.configService.get('FRONTEND_URL');
    return res.redirect(frontendUrl);
  }
}
