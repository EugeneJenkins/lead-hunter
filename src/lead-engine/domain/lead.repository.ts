import type { Lead } from './lead';

export interface LeadRepository {
  upsert(lead: Lead): Promise<Lead>;
}
