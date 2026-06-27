import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/di/tokens';
import { PrismaService } from '../database/prisma.service';
import type { AppLogger } from '../core/logger/logger';
import type { JsonObject } from '../shared/types/json';

@injectable()
export class JobDispatcher {
  constructor(
    @inject(TOKENS.PrismaService) private readonly prisma: PrismaService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async dispatch(type: string, payload: JsonObject, priority: number): Promise<void> {
    this.logger.debug({
      info: 'New job dispatched',
      type,
      priority,
    });

    await this.prisma.client.job.create({
      data: {
        type,
        payload,
        priority: priority,
      },
    });
  }
}
