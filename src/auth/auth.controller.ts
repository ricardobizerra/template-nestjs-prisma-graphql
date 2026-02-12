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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { User } from '@prisma/client';
import { getAvailableOAuthProviders } from './auth.constants';

@ApiTags('Authentication')
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
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'User signed in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res() res: FastifyReply) {
    const result = await this.authService.signIn(
      signInDto.username,
      signInDto.password,
    );

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return res.send({ user: result.user });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 per minute
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Refresh token not found',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessToken(refreshToken);

    // Rotate both tokens
    this.setTokenCookies(res, accessToken, newRefreshToken);

    return res.send({ message: 'Token refreshed successfully' });
  }

  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out and clear cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @HttpCode(HttpStatus.OK)
  async signOut(@Res() res: FastifyReply) {
    this.clearTokenCookies(res);
    return res.send({ message: 'Logged out successfully' });
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  @Throttle({ default: { ttl: 3600000, limit: 3 } }) // 3 per hour
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);

    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return { message: 'Password has been reset successfully' };
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 flow' })
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const user = req.user;

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Authentication failed',
      });
    }

    const accessToken = this.authService.generateAccessToken(user);
    const refreshToken = this.authService.generateRefreshToken(user);

    this.setTokenCookies(res, accessToken, refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    return res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 flow' })
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const user = req.user;

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Authentication failed',
      });
    }

    const accessToken = this.authService.generateAccessToken(user);
    const refreshToken = this.authService.generateRefreshToken(user);

    this.setTokenCookies(res, accessToken, refreshToken);

    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    return res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Get('csrf')
  @ApiOperation({ summary: 'Get CSRF token for subsequent requests' })
  @ApiResponse({ status: 200, description: 'Return new CSRF token' })
  async getCsrfToken(@Res() res: FastifyReply) {
    return res.send({ csrfToken: (res as any).generateCsrf() });
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available OAuth providers' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of configured OAuth providers',
  })
  getAvailableProviders() {
    return { providers: getAvailableOAuthProviders() };
  }
}
