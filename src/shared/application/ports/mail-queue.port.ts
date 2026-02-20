export const MAIL_QUEUE_PORT = Symbol('MAIL_QUEUE_PORT');

export interface MailQueuePort {
  enqueuePasswordReset(data: { email: string; token: string }): Promise<void>;
}
