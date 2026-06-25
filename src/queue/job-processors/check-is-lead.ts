import { inject, injectable } from 'tsyringe';
import { JobProcessor } from '../job-processor';
import { TOKENS } from '../../core/di/tokens';
import type { AppLogger } from '../../core/logger/logger';
import { JobType } from '../job-type';
import { OllamaFilter } from '../../lead-engine/ai-chat/ollama-filter';

type LeadPayload = {
  lead?: {
    rawPayload?: {
      text?: string;
    };
  };
};

@injectable()
export class CheckIsLead implements JobProcessor {
  readonly type = JobType.CheckIsLead;

  constructor(
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(TOKENS.OllamaFilter) private readonly ollamaFilter: OllamaFilter,
  ) {}

  async process(jobId: string, payload: LeadPayload): Promise<void> {
    this.logger.debug({
      jobId,
      payload,
    });

    this.logger.debug({
      step: 1,
      payload,
    });

    const text = payload?.lead?.rawPayload?.text ?? null;

    if (!text) {
      return;
    }

    const response = await this.ollamaFilter.isLead(text);

    this.logger.debug({
      step: 231,
      response,
      text,
    });

    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
