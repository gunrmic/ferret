import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

export async function feedRoutes(app: FastifyInstance) {
  app.get('/feed', async (request, reply) => {
    const { cursor, limit = '20', search } = request.query as Record<string, string>;

    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const cursorId = cursor ? parseInt(cursor, 10) : undefined;

    try {
      const scans = await prisma.scan.findMany({
        take,
        orderBy: { id: 'desc' },
        ...(cursorId
          ? { cursor: { id: cursorId }, skip: 1 }
          : {}),
        ...(search
          ? { where: { packageName: { contains: search, mode: 'insensitive' as const } } }
          : {}),
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
