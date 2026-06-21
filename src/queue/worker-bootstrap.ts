import { Worker } from './worker';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/di/tokens';
import { ConfigService } from '../core/config/config.service';
import { ProcessorRegistration } from './processor-registration';

@injectable()
export class WorkerBootstrap {
  constructor(
    @inject(TOKENS.ConfigService) private readonly configService: ConfigService,
    @inject(TOKENS.Worker) private readonly worker: Worker,
    @inject(TOKENS.ProcessorRegistration)
    private readonly processorRegistration: ProcessorRegistration,
  ) {}

  async start(): Promise<void> {
    this.processorRegistration.register();

    await this.worker.start(this.configService.config.workers.concurrency);
  }
}
