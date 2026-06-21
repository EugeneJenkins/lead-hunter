import cors from '@fastify/cors';
import fastify from 'fastify';
import type { DependencyContainer } from 'tsyringe';

import { registerHealthRoutes } from './routes/health.routes';
import type { ConfigService } from '../core/config/config.service';
import { TOKENS } from '../core/di/tokens';
import type { AppLogger } from '../core/logger/logger';
import type { ModuleRegistry } from '../core/modules/module-registry';
import type { PrismaService } from '../database/prisma.service';
import type { LeadEngineService } from '../lead-engine/application/lead-engine.service';
import type { SchedulerService } from '../scheduler/scheduler.service';
import type { Application } from '../shared/types/application';

export function createFastifyApplication(container: DependencyContainer): Application {
  const configService = container.resolve<ConfigService>(TOKENS.ConfigService);
  const logger = container.resolve<AppLogger>(TOKENS.Logger);
  const prismaService = container.resolve<PrismaService>(TOKENS.PrismaService);
  const moduleRegistry = container.resolve<ModuleRegistry>(TOKENS.ModuleRegistry);
  const scheduler = container.resolve<SchedulerService>(TOKENS.Scheduler);
  const worker = container.resolve<SchedulerService>(TOKENS.WorkerBootstrap);
  const leadEngine = container.resolve<LeadEngineService>(TOKENS.LeadEngine);

  const server = fastify({
    loggerInstance: logger,
  });

  return {
    async start(): Promise<void> {
      await server.register(cors, {
        origin: false,
      });

      registerHealthRoutes(server, prismaService);

      await prismaService.connect();
      leadEngine.start();
      scheduler.start();
      worker.start();
      await moduleRegistry.startEnabledModules();

      await server.listen({
        host: configService.config.server.host,
        port: configService.config.server.port,
      });

      logger.info(
        {
          host: configService.config.server.host,
          port: configService.config.server.port,
          env: configService.config.env,
        },
        'leadhunter api started',
      );
    },

    async stop(signal?: NodeJS.Signals): Promise<void> {
      logger.info({ signal }, 'leadhunter shutdown requested');
      await moduleRegistry.stopAll();
      scheduler.stop();
      await server.close();
      await prismaService.disconnect();
      logger.info('leadhunter stopped');
    },
  };
}
