import { Module, DynamicModule } from '@nestjs/common';
import { BullBoardModule as NestBullBoardModule } from '@bull-board/nestjs';
import { FastifyAdapter } from '@bull-board/fastify';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({})
class BullBoardPlaceholderModule {}

/**
 * Bull Board module configuration for NestJS.
 *
 * Usage in AppModule:
 * ```typescript
 * @Module({
 *   imports: [
 *     // ... other imports
 *     BullBoardModule.forRoot(),
 *     BullBoardModule.forFeature({ name: 'email', adapter: BullMQAdapter }),
 *   ],
 * })
 * ```
 *
 * Access the UI at: http://localhost:3333/admin/queues (Development only)
 */
export const BullBoardModule = {
  /**
   * Initialize Bull Board with FastifyAdapter.
   * Call this once in AppModule imports.
   */
  forRoot(): DynamicModule {
    if (process.env.NODE_ENV !== 'development') {
      return {
        module: BullBoardPlaceholderModule,
      };
    }

    return NestBullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: FastifyAdapter,
    });
  },

  /**
   * Register a queue with Bull Board.
   * Call this for each queue you want to monitor.
   *
   * @param options - Queue configuration
   * @param options.name - Queue name (must match the queue registered with BullModule)
   * @param options.adapter - Queue adapter (defaults to BullMQAdapter)
   */
  forFeature(options: {
    name: string;
    adapter?: typeof BullMQAdapter;
  }): DynamicModule {
    if (process.env.NODE_ENV !== 'development') {
      return {
        module: BullBoardPlaceholderModule,
      };
    }

    return NestBullBoardModule.forFeature({
      name: options.name,
      adapter: options.adapter || BullMQAdapter,
    });
  },
};

// Re-export for convenience
export { BullMQAdapter, FastifyAdapter };
