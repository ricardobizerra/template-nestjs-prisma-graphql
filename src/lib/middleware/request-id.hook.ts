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
  _reply: FastifyReply,
): Promise<void> {
  const existingId = request.headers[REQUEST_ID_HEADER];

  if (!existingId) {
    const requestId = randomUUID();
    // Modify headers to include request ID for downstream use
    (request.headers as Record<string, string>)[REQUEST_ID_HEADER] = requestId;
  }
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
