import type { DomainEvent, DomainEventHandler } from './domain-event';

export interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(
    eventType: TEvent['type'],
    handler: DomainEventHandler<TEvent>,
  ): void;
}
