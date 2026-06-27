import { injectable } from 'tsyringe';
import { JobProcessor } from './job-processor';
import type { JsonValue } from '../shared/types/json';

@injectable()
export class ProcessorRegistry {
  private readonly processors = new Map<string, JobProcessor>();

  register(processor: JobProcessor): void {
    this.processors.set(processor.type, processor);
  }

  async processJob(jobId: string, type: string, payload: JsonValue): Promise<void> {
    await this.get(type).process(jobId, payload);
  }

  get(type: string): JobProcessor {
    const processor = this.processors.get(type);

    if (!processor) {
      throw new Error(`Processor "${type}" not found`);
    }

    return processor;
  }
}
