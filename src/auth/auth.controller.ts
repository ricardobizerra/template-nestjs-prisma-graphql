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

  private setTokenCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const isProduction = nodeEnv === 'production';

    // Access token cookie (short-lived)
    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: this.configService.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
      path: '/',
    });

    // Refresh token cookie (long-lived)
    const refreshExpiresDays = this.configService.get(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
      { infer: true },
    );
    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: refreshExpiresDays * 24 * 60 * 60, // days to seconds
      path: '/auth', // Only sent to auth endpoints
    });

    return res;
  }

  private clearTokenCookies(res: FastifyReply) {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const isProduction = nodeEnv === 'production';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/auth',
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

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return res.send({
      accessToken: result.accessToken,
      user: result.user,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Refresh token not found',
      });
    }

    const { accessToken } =
      await this.authService.refreshAccessToken(refreshToken);

    // Update access token cookie
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: this.configService.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
      path: '/',
    });

    return res.send({ accessToken });
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Res() res: FastifyReply) {
    this.clearTokenCookies(res);
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

    const accessToken = this.authService.generateAccessToken(user);
    const refreshToken = this.authService.generateRefreshToken(user);

    this.setTokenCookies(res, accessToken, refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    return res.redirect(frontendUrl);
  }
}
