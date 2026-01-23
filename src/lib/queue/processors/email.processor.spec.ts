import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';
import { EmailService } from '@/lib/email/email.service';
import { PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: any;
  let logger: any;

  const mockEmailService = {
    sendPasswordReset: vi.fn(),
    sendWelcome: vi.fn(),
  };

  const mockLogger = {
    setContext: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: EmailService, useValue: mockEmailService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    emailService = module.get<EmailService>(EmailService);
    logger = module.get<PinoLogger>(PinoLogger);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should handle password-reset job', async () => {
      const job = {
        id: '1',
        name: 'password-reset',
        data: { email: 't@t.com', token: 'token' },
        attemptsMade: 0,
      } as Job;

      emailService.sendPasswordReset.mockResolvedValue(true);
      await processor.process(job);
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith('t@t.com', 'token');
    });

    it('should handle welcome job', async () => {
      const job = {
        id: '2',
        name: 'welcome',
        data: { email: 't@t.com', name: 'User' },
        attemptsMade: 0,
      } as Job;

      emailService.sendWelcome.mockResolvedValue(true);
      await processor.process(job);
      expect(emailService.sendWelcome).toHaveBeenCalledWith('t@t.com', 'User');
    });

    it('should throw error if email sending fails', async () => {
      const job = {
        id: '3',
        name: 'welcome',
        data: { email: 't@t.com', name: 'User' },
        attemptsMade: 0,
      } as Job;

      emailService.sendWelcome.mockResolvedValue(false);
      await expect(processor.process(job)).rejects.toThrow('Failed to send welcome email');
    });

    it('should warn for unknown job names', async () => {
      const job = {
        id: '4',
        name: 'unknown',
        data: {},
        attemptsMade: 0,
      } as Job;

      await processor.process(job);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Events', () => {
    it('should log on failed', () => {
      const job = { id: '1', name: 'test', attemptsMade: 1, opts: { attempts: 3 } } as Job;
      const error = new Error('fail');
      processor.onFailed(job, error);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log on completed', () => {
      const job = { id: '1', name: 'test' } as Job;
      processor.onCompleted(job);
      expect(logger.info).toHaveBeenCalled();
    });
  });
});
