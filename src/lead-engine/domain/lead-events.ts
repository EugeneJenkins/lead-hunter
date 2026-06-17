import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../core/events/domain-event';
import type { JsonValue } from '../../shared/types/json';
import type { Lead } from './lead';

export const SOURCE_LEAD_DISCOVERED = 'source.lead.discovered';
export const LEAD_FOUND = 'lead.found';

export interface SourceLeadPayload {
  readonly source: string;
  readonly externalId?: string;
  readonly title: string;
  readonly description?: string;
  readonly url?: string;
  readonly rawPayload?: JsonValue;
}

export type SourceLeadDiscoveredEvent = DomainEvent<SourceLeadPayload> & {
  readonly type: typeof SOURCE_LEAD_DISCOVERED;
};

export type LeadFoundEvent = DomainEvent<Lead> & {
  readonly type: typeof LEAD_FOUND;
};

export function createSourceLeadDiscoveredEvent(
  payload: SourceLeadPayload,
): SourceLeadDiscoveredEvent {
  return {
    id: randomUUID(),
    type: SOURCE_LEAD_DISCOVERED,
    occurredAt: new Date(),
    payload,
  };
}

export function createLeadFoundEvent(payload: Lead): LeadFoundEvent {
  return {
    id: randomUUID(),
    type: LEAD_FOUND,
    occurredAt: new Date(),
    payload,
  };
}
