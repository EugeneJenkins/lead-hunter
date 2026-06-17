import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../core/di/tokens';
import type { AppLogger } from '../core/logger/logger';

export interface ScheduledTask {
  readonly name: string;
  readonly intervalMs: number;
  run(): Promise<void>;
}

@injectable()
export class SchedulerService {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly tasks: ScheduledTask[] = [];

  public constructor(@inject(TOKENS.Logger) private readonly logger: AppLogger) {}

  public register(task: ScheduledTask): void {
    if (
      this.timers.has(task.name) ||
      this.tasks.some((registeredTask) => registeredTask.name === task.name)
    ) {
      throw new Error(`Scheduled task already registered: ${task.name}`);
    }

    this.tasks.push(task);
  }

  public start(): void {
    for (const task of this.tasks) {
      const timer = setInterval(() => {
        void task.run().catch((error) => {
          this.logger.error({ error, task: task.name }, 'scheduled task failed');
        });
      }, task.intervalMs);

      timer.unref();
      this.timers.set(task.name, timer);
      this.logger.info({ task: task.name, intervalMs: task.intervalMs }, 'scheduled task started');
    }

    this.logger.info({ taskCount: this.tasks.length }, 'scheduler initialized');
  }

  public stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.timers.clear();
    this.logger.info('scheduler stopped');
  }
}
