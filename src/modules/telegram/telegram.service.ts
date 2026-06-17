import { inject, injectable } from 'tsyringe';

import { ConfigService } from '../../core/config/config.service';
import type { EventBus } from '../../core/events/event-bus';
import type { AppLogger } from '../../core/logger/logger';
import type { SourceModule } from '../../core/modules/source-module';
import { TOKENS } from '../../core/di/tokens';
import type { TelegramModuleConfig } from './telegram.config';

@injectable()
export class TelegramSourceModule implements SourceModule {
  public readonly name = 'telegram';

  private readonly config: TelegramModuleConfig;

  public constructor(
    @inject(TOKENS.ConfigService) configService: ConfigService,
    @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {
    this.config = configService.config.modules.telegram;
  }

  public start(): Promise<void> {
    void this.eventBus;
    this.logger.info(
      {
        module: this.name,
        configured: Boolean(this.config.apiId && this.config.apiHash),
      },
      'telegram module placeholder initialized',
    );
    return Promise.resolve();
  }

  public stop(): Promise<void> {
    this.logger.info({ module: this.name }, 'telegram module placeholder stopped');
    return Promise.resolve();
  }
}
