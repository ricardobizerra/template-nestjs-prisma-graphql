import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '@/lib/email/email.service';

interface PasswordResetData {
  email: string;
  token: string;
}

interface WelcomeEmailData {
  email: string;
  name: string;
}

type EmailJobData = PasswordResetData | WelcomeEmailData;

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case 'password-reset':
        await this.handlePasswordReset(job as Job<PasswordResetData>);
        break;
      case 'welcome':
        await this.handleWelcome(job as Job<WelcomeEmailData>);
        break;
      default:
        console.warn(`[EmailProcessor] Unknown job type: ${job.name}`);
    }
  }

  private async handlePasswordReset(
    job: Job<PasswordResetData>,
  ): Promise<void> {
    const { email, token } = job.data;
    console.log(`[EmailProcessor] Processing password reset for ${email}`);

    const success = await this.emailService.sendPasswordReset(email, token);

    if (success) {
      console.log(`[EmailProcessor] Password reset email sent to ${email}`);
    } else {
      throw new Error(`Failed to send password reset email to ${email}`);
    }
  }

  private async handleWelcome(job: Job<WelcomeEmailData>): Promise<void> {
    const { email, name } = job.data;
    console.log(`[EmailProcessor] Processing welcome email for ${email}`);

    const success = await this.emailService.sendWelcome(email, name);

    if (success) {
      console.log(`[EmailProcessor] Welcome email sent to ${email}`);
    } else {
      throw new Error(`Failed to send welcome email to ${email}`);
    }
  }
}
