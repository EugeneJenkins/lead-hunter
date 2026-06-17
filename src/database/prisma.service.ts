import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../core/di/tokens';
import type { AppLogger } from '../core/logger/logger';

@injectable()
export class PrismaService {
  public readonly client: PrismaClient;

  public constructor(@inject(TOKENS.Logger) private readonly logger: AppLogger) {
    this.client = new PrismaClient();
  }

  public async connect(): Promise<void> {
    await this.client.$connect();
    this.logger.info('postgresql connection established');
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
    this.logger.info('postgresql connection closed');
  }

  public async ping(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error({ error }, 'postgresql readiness check failed');
      return false;
    }
  }
}
