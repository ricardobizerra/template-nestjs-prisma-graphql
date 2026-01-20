import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

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
  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case 'password-reset':
        await this.handlePasswordReset(job as Job<PasswordResetData>);
        break;
      case 'welcome':
        await this.handleWelcome(job as Job<WelcomeEmailData>);
        break;
      default:
        console.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handlePasswordReset(
    job: Job<PasswordResetData>,
  ): Promise<void> {
    const { email, token } = job.data;
    console.log(
      `[EmailProcessor] Sending password reset to ${email} with token ${token}`,
    );
    // TODO: Implement actual email sending
  }

  private async handleWelcome(job: Job<WelcomeEmailData>): Promise<void> {
    const { email, name } = job.data;
    console.log(`[EmailProcessor] Sending welcome email to ${email} (${name})`);
    // TODO: Implement actual email sending
  }
}
