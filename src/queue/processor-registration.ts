import { inject, injectable } from 'tsyringe';
import { ProcessorRegistry } from './processor-registry';
import { TOKENS } from '../core/di/tokens';
import { CheckIsLead } from './job-processors/check-is-lead';

@injectable()
export class ProcessorRegistration {
  constructor(
    @inject(TOKENS.ProcessorRegistry) private readonly registry: ProcessorRegistry,
    @inject(TOKENS.CheckIsLead) private readonly checkIsLead: CheckIsLead,
  ) {}

  register(): void {
    this.registry.register(this.checkIsLead);
  }
}
