import { UserService } from '@/user/user.service';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, genSalt, hash } from 'bcryptjs';
import { SignIn } from './models/sign-in.model';
import { userWithoutPassword } from '@/utils/user-without-password';
import { UserModel } from '@/user/models/user.model';
import { User } from '@prisma/client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async validateEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserModel> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    // OAuth-only users don't have a password
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses OAuth login. Please sign in with Google.',
      );
    }

    const passwordCheck = await compare(password, user.password);

    if (!passwordCheck) {
      throw new UnauthorizedException();
    }

    return userWithoutPassword(user);
  }

  async validateUserId(id: string): Promise<UserModel> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return userWithoutPassword(user);
  }

  generateToken(user: User | UserModel): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async signIn(email: string, password: string): Promise<SignIn> {
    const user = await this.validateEmailAndPassword(email, password);

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Don't reveal if user exists or not
    if (!user) {
      return;
    }

    // OAuth-only users can't reset password
    if (!user.password) {
      return;
    }

    // Delete any existing tokens for this user
    await this.prismaService.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Create token with 1 hour expiration
    await this.prismaService.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Queue email job
    await this.emailQueue.add('password-reset', {
      email: user.email,
      token,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.prismaService.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prismaService.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const salt = await genSalt(10);
    const hashedPassword = await hash(newPassword, salt);

    // Update user password
    await this.prismaService.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete used token
    await this.prismaService.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
  }
}
