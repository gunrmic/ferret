import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', async (request, reply) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    try {
      const [totalPackages, scansToday, totalAlerts] = await Promise.all([
        prisma.package.count(),
        prisma.scan.count({ where: { scannedAt: { gte: startOfToday } } }),
        prisma.alert.count(),
      ]);

      return reply.send({ totalPackages, scansToday, totalAlerts });
    } catch (err) {
      request.log.error({ err }, 'Stats query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
