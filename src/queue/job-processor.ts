import type { JsonValue } from '../shared/types/json';

export interface JobProcessor {
  readonly type: string;

  process(jobId: string, payload: JsonValue): Promise<void>;
}
