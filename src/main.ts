import 'reflect-metadata';
import 'dotenv/config';

import { buildContainer } from './core/di/container';
import { TOKENS } from './core/di/tokens';
import type { Application } from './shared/types/application';

async function main(): Promise<void> {
  const container = buildContainer();
  const app = container.resolve<Application>(TOKENS.Application);

  await app.start();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    await app.stop(signal);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
