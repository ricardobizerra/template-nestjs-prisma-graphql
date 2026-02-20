export const DOMAIN_EVENT_PUBLISHER_PORT = Symbol(
  'DOMAIN_EVENT_PUBLISHER_PORT',
);

export interface DomainEventPublisherPort {
  publishUserCreated(payload: {
    email: string;
    name: string;
    role: string;
  }): Promise<void>;
}
