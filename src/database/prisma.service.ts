import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';

import { ConfigService } from '../core/config/config.service';
import { TOKENS } from '../core/di/tokens';
import type { AppLogger } from '../core/logger/logger';

@injectable()
export class PrismaService {
  public readonly client: PrismaClient;

  public constructor(
    @inject(TOKENS.ConfigService) configService: ConfigService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {
    const adapter = new PrismaPg(configService.config.database.url);
    this.client = new PrismaClient({ adapter });
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
