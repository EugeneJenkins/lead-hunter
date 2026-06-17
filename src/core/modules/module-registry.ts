import type { DependencyContainer } from 'tsyringe';

import { sourceModuleManifests } from '../../modules';
import type { ConfigService } from '../config/config.service';
import type { AppLogger } from '../logger/logger';
import type { SourceModule } from './source-module';

export class ModuleRegistry {
  private readonly activeModules: SourceModule[] = [];

  public constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly container: DependencyContainer,
  ) {}

  public async startEnabledModules(): Promise<void> {
    for (const manifest of sourceModuleManifests) {
      if (!this.configService.isModuleEnabled(manifest.name)) {
        this.logger.info({ module: manifest.name }, 'source module disabled');
        continue;
      }

      const moduleInstance = manifest.create(this.container);
      await moduleInstance.start();
      this.activeModules.push(moduleInstance);
      this.logger.info({ module: manifest.name }, 'source module started');
    }
  }

  public async stopAll(): Promise<void> {
    await Promise.all(
      [...this.activeModules].reverse().map(async (moduleInstance) => {
        await moduleInstance.stop();
        this.logger.info({ module: moduleInstance.name }, 'source module stopped');
      }),
    );

    this.activeModules.length = 0;
  }
}
