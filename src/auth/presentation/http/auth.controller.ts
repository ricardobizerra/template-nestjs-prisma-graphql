import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { SignInDto } from '@/auth/dto/sign-in.dto';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { getAvailableOAuthProviders } from '@/auth/auth.constants';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import { Inject } from '@nestjs/common';
import { ConfigPort } from '@/shared/application/ports/config.port';
import { CONFIG_PORT } from '@/shared/application/ports/config.port';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signInUseCase: SignInUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly authCookieService: AuthCookieService,
    @Inject(SESSION_TOKEN_PORT)
    private readonly sessionTokenPort: SessionTokenPort,
    @Inject(CONFIG_PORT)
    private readonly configPort: ConfigPort,
  ) {}

  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'User signed in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res() res: FastifyReply) {
    const result = await this.signInUseCase.execute(
      signInDto.username,
      signInDto.password,
    );

    this.authCookieService.setTokenCookies(
      res,
      result.accessToken,
      result.refreshToken,
    );

    return res.send({ user: result.user });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Refresh token not found',
      });
    }

    const rotatedTokens =
      await this.refreshSessionUseCase.execute(refreshToken);

    this.authCookieService.setTokenCookies(
      res,
      rotatedTokens.accessToken,
      rotatedTokens.refreshToken,
    );

    return res.send({ message: 'Token refreshed successfully' });
  }

  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out and clear cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @HttpCode(HttpStatus.OK)
  async signOut(@Res() res: FastifyReply) {
    this.authCookieService.clearTokenCookies(res);
    return res.send({ message: 'Logged out successfully' });
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.requestPasswordResetUseCase.execute(forgotPasswordDto.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return { message: 'Password has been reset successfully' };
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 flow' })
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    if (!req.user) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Authentication failed',
      });
    }

    const accessToken = this.sessionTokenPort.generateAccessToken(
      req.user as any,
    );
    const refreshToken = this.sessionTokenPort.generateRefreshToken(
      req.user as any,
    );

    this.authCookieService.setTokenCookies(res, accessToken, refreshToken);

    return res.redirect(`${this.configPort.getFrontendUrl()}/auth/callback`);
  }

  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 flow' })
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    if (!req.user) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        message: 'Authentication failed',
      });
    }

    const accessToken = this.sessionTokenPort.generateAccessToken(
      req.user as any,
    );
    const refreshToken = this.sessionTokenPort.generateRefreshToken(
      req.user as any,
    );

    this.authCookieService.setTokenCookies(res, accessToken, refreshToken);

    return res.redirect(`${this.configPort.getFrontendUrl()}/auth/callback`);
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
