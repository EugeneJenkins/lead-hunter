import { inject, injectable } from 'tsyringe';
import { JobProcessor } from '../job-processor';
import { TOKENS } from '../../core/di/tokens';
import type { AppLogger } from '../../core/logger/logger';
import { JobType } from '../job-type';

@injectable()
export class CheckIsLead implements JobProcessor {
  readonly type = JobType.CheckIsLead;

  constructor(@inject(TOKENS.Logger) private readonly logger: AppLogger) {}

  async process(jobId: string, payload: object): Promise<void> {
    this.logger.debug({
      jobId,
      payload,
    });

    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
