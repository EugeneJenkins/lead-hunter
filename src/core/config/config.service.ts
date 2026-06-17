import { injectable } from 'tsyringe';
import { ZodError } from 'zod';

import { ConfigurationError } from '../../shared/errors/configuration-error';
import { type AppConfig, parseConfig } from './config.schema';

@injectable()
export class ConfigService {
  public readonly config: AppConfig;

  public constructor(env: NodeJS.ProcessEnv = process.env) {
    try {
      this.config = parseConfig(env);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError(error.errors.map((issue) => issue.message).join('; '));
      }

      throw error;
    }
  }

  public isModuleEnabled(moduleName: string): boolean {
    if (moduleName === 'telegram') {
      return this.config.modules.telegram.enabled;
    }

    return this.config.modules.enabled.includes(moduleName);
  }
}
