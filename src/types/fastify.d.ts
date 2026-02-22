import * as schema from '@/lib/drizzle/schema';

type User = typeof schema.users.$inferSelect;

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    session?: any;
    connection?: {
      encrypted: boolean;
    };
  }

  interface FastifyReply {
    redirect(url: string, statusCode?: number): FastifyReply;
    setHeader(name: string, value: string): FastifyReply;
    end(): FastifyReply;
  }
}
