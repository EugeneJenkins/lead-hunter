import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../core/di/tokens';
import type { EventBus } from '../../core/events/event-bus';
import type { AppLogger } from '../../core/logger/logger';
import {
  createLeadFoundEvent,
  SOURCE_LEAD_DISCOVERED,
  type SourceLeadDiscoveredEvent,
} from '../domain/lead-events';
import type { LeadRepository } from '../domain/lead.repository';

@injectable()
export class LeadEngineService {
  private started = false;

  public constructor(
    @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    @inject(TOKENS.LeadRepository) private readonly leadRepository: LeadRepository,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  public start(): void {
    if (this.started) {
      return;
    }

    this.eventBus.subscribe<SourceLeadDiscoveredEvent>(SOURCE_LEAD_DISCOVERED, async (event) => {
      await this.processSourceLead(event);
    });

    this.started = true;
    this.logger.info('lead engine initialized');
  }

  private async processSourceLead(event: SourceLeadDiscoveredEvent): Promise<void> {
    const lead = await this.leadRepository.upsert({
      source: event.payload.source,
      externalId: event.payload.externalId,
      title: event.payload.title,
      description: event.payload.description,
      url: event.payload.url,
      rawPayload: event.payload.rawPayload,
    });

    await this.eventBus.publish(createLeadFoundEvent(lead));
    this.logger.info({ leadId: lead.id, source: lead.source }, 'lead processed');
  }
}
