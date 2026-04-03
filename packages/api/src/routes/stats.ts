import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', async (_request, reply) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalPackages, scansToday, totalAlerts] = await Promise.all([
      prisma.package.count(),
      prisma.scan.count({ where: { scannedAt: { gte: startOfToday } } }),
      prisma.alert.count(),
    ]);

    return reply.send({ totalPackages, scansToday, totalAlerts });
  });
}
