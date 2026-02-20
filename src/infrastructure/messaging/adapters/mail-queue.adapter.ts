import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MailQueuePort } from '@/shared/application/ports/mail-queue.port';

@Injectable()
export class BullMqMailQueueAdapter implements MailQueuePort {
  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async enqueuePasswordReset(data: {
    email: string;
    token: string;
  }): Promise<void> {
    await this.emailQueue.add('password-reset', data);
  }
}
