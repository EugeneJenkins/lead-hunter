import { ProcessorRegistry } from './processor-registry';
import { QueueService } from './queue.service';
import { inject, injectable } from 'tsyringe';
import { randomUUID } from 'crypto';
import { TOKENS } from '../core/di/tokens';
import { type Job } from '@prisma/client';
import { AppLogger } from '../core/logger/logger';
import type { JsonValue } from '../shared/types/json';

@injectable()
export class Worker {
  private readonly workerId = randomUUID();
  private readonly delay = 1000;

  constructor(
    @inject(TOKENS.ProcessorRegistry) private readonly processorRegistry: ProcessorRegistry,
    @inject(TOKENS.QueueService) private readonly queueService: QueueService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async poll(concurrency: number): Promise<void> {
    const jobs = await this.queueService.lockNextJobs(this.workerId, concurrency);

    this.logger.debug({ workerId: this.workerId, jobCount: jobs.length }, 'jobs locked');

    for (const job of jobs) {
      this.logger.debug(
        { workerId: this.workerId, jobId: job.id, jobType: job.type },
        'starting job',
      );

      await this.processJob(job);
    }
  }

  async processJob(job: Job): Promise<void> {
    try {
      await this.processorRegistry.processJob(job.id, job.type, job.payload as JsonValue);
      await this.queueService.markCompleted(job.id);
    } catch (error) {
      this.logger.error(
        {
          error,
          workerId: this.workerId,
          jobId: job.id,
          jobType: job.type,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          stage: 'job-processing',
        },
        'job failed',
      );
      await this.queueService.markFailed(job, error);
    }
  }

  async start(concurrency: number): Promise<void> {
    this.logger.debug('Started worker class');

    while (true) {
      try {
        await this.poll(concurrency);
      } catch (error) {
        this.logger.error(error);
      }

      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
  }
}
