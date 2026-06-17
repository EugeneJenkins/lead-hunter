import type { DependencyContainer } from 'tsyringe';

import type { SourceModule } from './source-module';

export interface SourceModuleManifest {
  readonly name: string;
  create(container: DependencyContainer): SourceModule;
}
