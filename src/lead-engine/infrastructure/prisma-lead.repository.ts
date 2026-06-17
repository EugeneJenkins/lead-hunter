import { Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../core/di/tokens';
import { PrismaService } from '../../database/prisma.service';
import type { Lead } from '../domain/lead';
import type { LeadRepository } from '../domain/lead.repository';

@injectable()
export class PrismaLeadRepository implements LeadRepository {
  public constructor(@inject(TOKENS.PrismaService) private readonly prismaService: PrismaService) {}

  public async upsert(lead: Lead): Promise<Lead> {
    const rawPayload = lead.rawPayload as Prisma.InputJsonValue | undefined;

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
        title: lead.title,
        description: lead.description,
        url: lead.url,
        rawPayload,
      },
      update: {
        title: lead.title,
        description: lead.description,
        url: lead.url,
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
