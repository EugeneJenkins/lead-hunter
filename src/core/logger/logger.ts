import pino, { type Logger, type LoggerOptions } from 'pino';

import type { AppConfig } from '../config/config.schema';

export type AppLogger = Logger;

export function createLogger(config: AppConfig['logger']): AppLogger {
  const options: LoggerOptions = {
    level: config.level,
    base: undefined,
  };

  if (config.pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
      },
    };
  }

  return pino(options);
}
