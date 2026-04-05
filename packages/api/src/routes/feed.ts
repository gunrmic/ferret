import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

export async function feedRoutes(app: FastifyInstance) {
  app.get('/feed', async (request, reply) => {
    const { cursor, limit = '20', search, minScore, alerted } =
      request.query as Record<string, string>;

    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const cursorId = cursor ? parseInt(cursor, 10) : undefined;

    // Build where clause from filters
    const where: Record<string, unknown> = {};
    if (search) {
      where.packageName = { contains: search, mode: 'insensitive' };
    }
    if (minScore) {
      const score = parseInt(minScore, 10);
      if (!isNaN(score)) where.riskScore = { gte: score };
    }
    if (alerted === 'true') {
      where.alerted = true;
    }

    try {
      const scans = await prisma.scan.findMany({
        take,
        orderBy: { id: 'desc' },
        ...(cursorId
          ? { cursor: { id: cursorId }, skip: 1 }
          : {}),
        ...(Object.keys(where).length > 0 ? { where } : {}),
        select: {
          id: true,
          packageName: true,
          version: true,
          previousVersion: true,
          riskScore: true,
          staticFlags: true,
          scannedAt: true,
          alerted: true,
        },
      });

      const nextCursor = scans.length === take ? scans[scans.length - 1].id : null;

      return reply.send({ scans, nextCursor });
    } catch (err) {
      request.log.error({ err }, 'Feed query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
