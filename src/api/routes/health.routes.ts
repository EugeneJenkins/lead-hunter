import type {
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';

import type { PrismaService } from '../../database/prisma.service';
import type { AppLogger } from '../../core/logger/logger';

type LeadHunterFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  AppLogger
>;

export function registerHealthRoutes(
  server: LeadHunterFastifyInstance,
  prismaService: PrismaService,
): void {
  server.get('/health', () => ({
    status: 'ok',
    service: 'leadhunter',
    timestamp: new Date().toISOString(),
  }));

  server.get('/health/ready', async (_request, reply) => {
    const databaseReady = await prismaService.ping();

    if (!databaseReady) {
      return reply.status(503).send({
        status: 'unavailable',
        database: 'down',
      });
    }

    return {
      status: 'ready',
      database: 'up',
    };
  });
}
