import type { JsonValue } from '../../shared/types/json';

export interface Lead {
  readonly id?: string;
  readonly source: string;
  readonly externalId?: string;
  readonly title: string;
  readonly description?: string;
  readonly url?: string;
  readonly rawPayload?: JsonValue;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
