import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '@/lib/email/email.service';
import { PinoLogger } from 'nestjs-pino';

interface PasswordResetData {
  email: string;
  token: string;
}

interface WelcomeEmailData {
  email: string;
  name: string;
}

type EmailJobData = PasswordResetData | WelcomeEmailData;

/**
 * Default job options for email queue.
 * Configure retry behavior and backoff strategy.
 */
export const EMAIL_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 1000, // Keep last 1000 failed jobs for debugging
};

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(EmailProcessor.name);
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.info(
      { jobId: job.id, jobName: job.name, attempt: job.attemptsMade + 1 },
      'Processing email job',
    );

    switch (job.name) {
      case 'password-reset':
        await this.handlePasswordReset(job as Job<PasswordResetData>);
        break;
      case 'welcome':
        await this.handleWelcome(job as Job<WelcomeEmailData>);
        break;
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown email job type');
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData>, error: Error): void {
    this.logger.error(
      {
        jobId: job.id,
        jobName: job.name,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message,
        stack: error.stack,
      },
      'Email job failed',
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>): void {
    this.logger.info(
      { jobId: job.id, jobName: job.name },
      'Email job completed successfully',
    );
  }

  private async handlePasswordReset(
    job: Job<PasswordResetData>,
  ): Promise<void> {
    const { email, token } = job.data;

    const success = await this.emailService.sendPasswordReset(email, token);

    if (!success) {
      throw new Error(`Failed to send password reset email to ${email}`);
    }
  }

  private async handleWelcome(job: Job<WelcomeEmailData>): Promise<void> {
    const { email, name } = job.data;

    const success = await this.emailService.sendWelcome(email, name);

    if (!success) {
      throw new Error(`Failed to send welcome email to ${email}`);
    }
  }
}
