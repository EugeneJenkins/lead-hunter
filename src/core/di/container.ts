import { container, type DependencyContainer } from 'tsyringe';

import { createFastifyApplication } from '../../api/server';
import { PrismaService } from '../../database/prisma.service';
import { PrismaLeadRepository } from '../../lead-engine/infrastructure/prisma-lead.repository';
import { LeadEngineService } from '../../lead-engine/application/lead-engine.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { ConfigService } from '../config/config.service';
import { InMemoryEventBus } from '../events/in-memory-event-bus';
import { createLogger } from '../logger/logger';
import { ModuleRegistry } from '../modules/module-registry';
import { TOKENS } from './tokens';

export function buildContainer(): DependencyContainer {
  const appContainer = container.createChildContainer();

  const configService = new ConfigService(process.env);
  const logger = createLogger(configService.config.logger);

  appContainer.registerInstance(TOKENS.ConfigService, configService);
  appContainer.registerInstance(TOKENS.Logger, logger);

  appContainer.registerSingleton(TOKENS.EventBus, InMemoryEventBus);
  appContainer.registerSingleton(TOKENS.PrismaService, PrismaService);
  appContainer.registerSingleton(TOKENS.LeadRepository, PrismaLeadRepository);
  appContainer.registerSingleton(TOKENS.LeadEngine, LeadEngineService);
  appContainer.registerSingleton(TOKENS.Scheduler, SchedulerService);
  appContainer.registerInstance(
    TOKENS.ModuleRegistry,
    new ModuleRegistry(configService, logger, appContainer),
  );

  appContainer.register(TOKENS.Application, {
    useFactory: createFastifyApplication,
  });

  return appContainer;
}
