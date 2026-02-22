import * as crypto from 'node:crypto';

export function generateUUID(): string {
  return crypto.randomUUID();
}
