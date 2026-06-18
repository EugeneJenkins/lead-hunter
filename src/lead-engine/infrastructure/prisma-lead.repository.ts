import { Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../core/di/tokens';
import { PrismaService } from '../../database/prisma.service';
import type { Lead } from '../domain/lead';
import type { LeadRepository } from '../domain/lead.repository';
import type { JsonValue } from '../../shared/types/json';

@injectable()
export class PrismaLeadRepository implements LeadRepository {
  public constructor(@inject(TOKENS.PrismaService) private readonly prismaService: PrismaService) {}

  public async upsert(lead: Lead): Promise<Lead> {
    const rawPayload = sanitizeJsonValue(lead.rawPayload) as Prisma.InputJsonValue | undefined;

    const persisted = await this.prismaService.client.lead.upsert({
      where: {
        source_externalId: {
          source: lead.source,
          externalId: lead.externalId ?? '',
        },
      },
      create: {
        source: lead.source,
        externalId: lead.externalId ?? '',
        title: sanitizeText(lead.title),
        description: sanitizeOptionalText(lead.description),
        url: sanitizeOptionalText(lead.url),
        rawPayload,
      },
      update: {
        title: sanitizeText(lead.title),
        description: sanitizeOptionalText(lead.description),
        url: sanitizeOptionalText(lead.url),
        rawPayload,
      },
    });

    return {
      id: persisted.id,
      source: persisted.source,
      externalId: persisted.externalId ?? undefined,
      title: persisted.title,
      description: persisted.description ?? undefined,
      url: persisted.url ?? undefined,
      rawPayload: persisted.rawPayload as Lead['rawPayload'],
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    };
  }
}

function sanitizeOptionalText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : sanitizeText(value);
}

function sanitizeText(value: string): string {
  let sanitized = '';

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 0) {
      continue;
    }

    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = value.charCodeAt(index + 1);

      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        sanitized += value[index] ?? '';
        sanitized += value[index + 1] ?? '';
        index += 1;
      }

      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    sanitized += value[index] ?? '';
  }

  return sanitized;
}

function sanitizeJsonValue(value: JsonValue | undefined): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item) ?? null);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      sanitizeText(key),
      sanitizeJsonValue(item) ?? null,
    ]),
  );
}
