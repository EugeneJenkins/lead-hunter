export const TOKENS = {
  Application: Symbol.for('Application'),
  ConfigService: Symbol.for('ConfigService'),
  Logger: Symbol.for('Logger'),
  EventBus: Symbol.for('EventBus'),
  PrismaService: Symbol.for('PrismaService'),
  LeadRepository: Symbol.for('LeadRepository'),
  LeadEngine: Symbol.for('LeadEngine'),
  Scheduler: Symbol.for('Scheduler'),
  ModuleRegistry: Symbol.for('ModuleRegistry'),

  // Worker
  WorkerBootstrap: Symbol.for('WorkerBootstrap'),
  Worker: Symbol.for('Worker'),
  JobDispatcher: Symbol.for('JobDispatcher'),
  QueueService: Symbol.for('QueueService'),
  ProcessorRegistry: Symbol.for('ProcessorRegistry'),
  ProcessorRegistration: Symbol.for('ProcessorRegistration'),
  CheckIsLead: Symbol.for('CheckIsLead'),
} as const;
