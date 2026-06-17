import type { DependencyContainer } from 'tsyringe';

import type { SourceModuleManifest } from '../../core/modules/module-manifest';
import type { SourceModule } from '../../core/modules/source-module';
import { TelegramSourceModule } from './telegram.service';

export const telegramModuleManifest: SourceModuleManifest = {
  name: 'telegram',
  create(container: DependencyContainer): SourceModule {
    return container.resolve(TelegramSourceModule);
  },
};
