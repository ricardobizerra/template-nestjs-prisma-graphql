import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { ModuleRef } from '@nestjs/core';
import { Env } from '@/env';

/**
 * Bull Board module for queue monitoring UI.
 * Access at /admin/queues in development mode only.
 */
@Module({})
export class BullBoardModule implements OnModuleInit {
  private serverAdapter: FastifyAdapter;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.serverAdapter = new FastifyAdapter();
    this.serverAdapter.setBasePath('/admin/queues');
  }

  async onModuleInit() {
    // Only initialize in development
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    if (nodeEnv !== 'development') {
      return;
    }

    try {
      // Get the email queue from the module
      const emailQueue = this.moduleRef.get<Queue>(getQueueToken('email'), {
        strict: false,
      });

      // Create Bull Board with all queues
      createBullBoard({
        queues: [new BullMQAdapter(emailQueue)],
        serverAdapter: this.serverAdapter,
      });
    } catch (error) {
      console.warn('Could not initialize Bull Board:', error);
    }
  }

  /**
   * Returns the Fastify adapter for registering with the main app.
   */
  getServerAdapter(): FastifyAdapter {
    return this.serverAdapter;
  }
}
