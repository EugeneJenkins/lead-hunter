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
import { WorkerBootstrap } from '../../queue/worker-bootstrap';
import { JobDispatcher } from '../../queue/job-dispatcher';
import { QueueService } from '../../queue/queue.service';
import { Worker } from '../../queue/worker';
import { ProcessorRegistry } from '../../queue/processor-registry';
import { CheckIsLead } from '../../queue/job-processors/check-is-lead';
import { ProcessorRegistration } from '../../queue/processor-registration';
import { OllamaFilter } from '../../lead-engine/ai-chat/ollama-filter';

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

  appContainer.registerSingleton(TOKENS.WorkerBootstrap, WorkerBootstrap);
  appContainer.registerSingleton(TOKENS.Worker, Worker);
  appContainer.registerSingleton(TOKENS.JobDispatcher, JobDispatcher);
  appContainer.registerSingleton(TOKENS.QueueService, QueueService);
  appContainer.registerSingleton(TOKENS.ProcessorRegistry, ProcessorRegistry);
  appContainer.registerSingleton(TOKENS.ProcessorRegistration, ProcessorRegistration);
  appContainer.registerSingleton(TOKENS.CheckIsLead, CheckIsLead);
  appContainer.registerSingleton(TOKENS.OllamaFilter, OllamaFilter);

  appContainer.registerInstance(
    TOKENS.ModuleRegistry,
    new ModuleRegistry(configService, logger, appContainer),
  );

  appContainer.register(TOKENS.Application, {
    useFactory: createFastifyApplication,
  });

  return appContainer;
}
