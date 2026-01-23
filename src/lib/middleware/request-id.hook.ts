import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Request ID header name.
 * Standard header for distributed tracing.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Fastify hook to add request ID to all requests.
 * If a request ID is already present in headers, it is preserved.
 * Otherwise, a new UUID is generated.
 *
 * Usage in main.ts:
 * ```ts
 * const fastify = app.getHttpAdapter().getInstance();
 * fastify.addHook('onRequest', requestIdHook);
 * ```
 */
export async function requestIdHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Fastify request.id is now a UUID globally (configured in main.ts)
  // We just ensure it's sent back in the response headers for the client
  reply.header(REQUEST_ID_HEADER, request.id);
}

/**
 * Type augmentation to include request ID on FastifyRequest.
 * Allows type-safe access to request.requestId across the application.
 */
declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string;
  }
}
