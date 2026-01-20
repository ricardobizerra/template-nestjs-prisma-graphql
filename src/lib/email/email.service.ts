import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Env } from '@/env';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
    this.fromEmail = this.configService.get('MAIL_FROM_EMAIL');
  }

  async send(options: SendEmailOptions): Promise<{ id: string } | null> {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      return null;
    }

    console.log(`[EmailService] Email sent successfully: ${data?.id}`);
    return data;
  }

  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const result = await this.send({
      to: email,
      subject: 'Reset your password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    });

    return result !== null;
  }

  async sendWelcome(email: string, name: string): Promise<boolean> {
    const result = await this.send({
      to: email,
      subject: 'Welcome!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for signing up. We're excited to have you on board!</p>
      `,
      text: `Welcome, ${name}! Thank you for signing up.`,
    });

    return result !== null;
  }
}
