import { inject, injectable } from 'tsyringe';

import type { AppLogger } from '../logger/logger';
import { TOKENS } from '../di/tokens';
import type { DomainEvent, DomainEventHandler } from './domain-event';
import type { EventBus } from './event-bus';

@injectable()
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  public constructor(@inject(TOKENS.Logger) private readonly logger: AppLogger) {}

  public subscribe<TEvent extends DomainEvent>(
    eventType: TEvent['type'],
    handler: DomainEventHandler<TEvent>,
  ): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as DomainEventHandler);
    this.handlers.set(eventType, handlers);
  }

  public async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    this.logger.debug({ eventType: event.type, handlerCount: handlers.length }, 'publishing event');

    await Promise.all(handlers.map((handler) => Promise.resolve(handler(event))));
  }
}
