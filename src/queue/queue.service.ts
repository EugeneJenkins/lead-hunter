import { Job } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/di/tokens';
import { PrismaService } from '../database/prisma.service';

@injectable()
export class QueueService {
  constructor(@inject(TOKENS.PrismaService) private readonly prisma: PrismaService) {}

  async lockNextJobs(workerId: string, limit: number): Promise<Job[]> {
    return this.prisma.client.$queryRaw<Job[]>`
      UPDATE "Job"
      SET status      = 'RUNNING',
          "lockedAt"  = NOW(),
          "lockedBy"  = ${workerId},
          "updatedAt" = NOW()
      WHERE id IN (SELECT id
                   FROM "Job"
                   WHERE status = 'PENDING'
                     AND (
                     "runAt" IS NULL
                       OR "runAt" <= NOW()
                     )
                   ORDER BY priority DESC, "createdAt" ASC
        LIMIT ${limit}
        FOR
      UPDATE SKIP LOCKED
        )
        RETURNING *;
    `;
  }

  async markCompleted(jobId: string): Promise<void> {
    await this.prisma.client.job.update({
      where: {
        id: jobId,
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markFailed(job: Job, error: unknown): Promise<void> {
    const attempts = job.attempts + 1;

    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    };

    if (attempts >= job.maxAttempts) {
      await this.prisma.client.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: 'FAILED',
          attempts,
          failedAt: new Date(),
          lastError: errorData,
          lockedAt: null,
          lockedBy: null,
        },
      });

      return;
    }

    const delaySeconds = Math.pow(2, attempts) * 60;

    await this.prisma.client.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: 'PENDING',
        attempts,
        lastError: errorData,
        runAt: new Date(Date.now() + delaySeconds * 1000),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async unlockStaleJobs(): Promise<void> {
    await this.prisma.client.job.updateMany({
      where: {
        status: 'RUNNING',
        lockedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}
