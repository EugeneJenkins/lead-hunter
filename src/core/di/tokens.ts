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
} as const;
