import { inject, injectable } from 'tsyringe';
import { JobProcessor } from '../job-processor';
import { TOKENS } from '../../core/di/tokens';
import type { AppLogger } from '../../core/logger/logger';
import { JobType } from '../job-type';
import {
  type LeadClassificationResult,
  OllamaFilter,
} from '../../lead-engine/ai-chat/ollama-filter';
import type { JsonObject, JsonValue } from '../../shared/types/json';

type LeadPayload = {
  lead?: {
    id?: string;
    source?: string;
    externalId?: string | null;
    rawPayload?: {
      text?: string;
      chatId?: string;
      messageId?: number;
    };
  };
};

@injectable()
export class CheckIsLead implements JobProcessor {
  readonly type = JobType.CheckIsLead;

  constructor(
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(TOKENS.OllamaFilter) private readonly ollamaFilter: OllamaFilter,
  ) {}

  async process(jobId: string, payload: JsonValue): Promise<void> {
    const leadPayload = this.toLeadPayload(payload);
    const lead = leadPayload.lead;
    const text = lead?.rawPayload?.text?.trim() ?? '';
    const context = {
      jobId,
      leadId: lead?.id,
      source: lead?.source,
      externalId: lead?.externalId,
      chatId: lead?.rawPayload?.chatId,
      messageId: lead?.rawPayload?.messageId,
      stage: 'check-is-lead',
    };

    if (!text) {
      this.logger.debug(context, 'lead classification skipped because message text is empty');
      return;
    }

    const result: LeadClassificationResult = await this.ollamaFilter.classifyMessage(text);

    this.logger.debug(
      {
        ...context,
        isLead: result.isLead,
        reason: result.reason,
        textLength: text.length,
      },
      'lead classified',
    );
  }

  private toLeadPayload(payload: JsonValue): LeadPayload {
    if (!this.isJsonObject(payload)) {
      return {};
    }

    const lead = this.isJsonObject(payload.lead) ? payload.lead : undefined;
    const rawPayload = lead && this.isJsonObject(lead.rawPayload) ? lead.rawPayload : undefined;

    return {
      lead: lead
        ? {
            id: this.getString(lead.id),
            source: this.getString(lead.source),
            externalId: this.getNullableString(lead.externalId),
            rawPayload: rawPayload
              ? {
                  text: this.getString(rawPayload.text),
                  chatId: this.getString(rawPayload.chatId),
                  messageId: this.getNumber(rawPayload.messageId),
                }
              : undefined,
          }
        : undefined,
    };
  }

  private isJsonObject(value: JsonValue | undefined): value is JsonObject {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private getString(value: JsonValue | undefined): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private getNullableString(value: JsonValue | undefined): string | null | undefined {
    return value === null ? null : this.getString(value);
  }

  private getNumber(value: JsonValue | undefined): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }
}
