import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/lib/email/email.service';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { Resend } from 'resend';

describe('EmailService', () => {
  let service: EmailService;
  let mockResend: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 'test-key';
              if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mockResend = {
      emails: {
        send: vi.fn(),
      },
    };
    (service as any).resend = mockResend;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should send an email successfully', async () => {
      const mockResult = { data: { id: 'email-id' }, error: null };
      mockResend.emails.send.mockResolvedValue(mockResult);

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result).toEqual({ id: 'email-id' });
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      const mockError = { data: null, error: { message: 'Failed' } };
      mockResend.emails.send.mockResolvedValue(mockError);

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result).toBeNull();
    });
  });

  describe('Password Reset', () => {
    it('should send a password reset email', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'id' },
        error: null,
      });

      const result = await service.sendPasswordReset(
        'user@example.com',
        'token-123',
      );

      expect(result).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });
  });

  describe('Welcome Email', () => {
    it('should send a welcome email', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'id' },
        error: null,
      });

      const result = await service.sendWelcome('user@example.com', 'John');

      expect(result).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });
  });
});
