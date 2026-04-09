import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';
import { renderAlertsPage } from '../views/alerts.js';

export async function alertsRoutes(app: FastifyInstance) {
  app.get('/alerts', async (request, reply) => {
    const wantsHtml = (request.headers.accept ?? '')
      .split(',')
      .some((part) => part.trim().split(';')[0].trim() === 'text/html');

    try {
      const alerts = await prisma.alert.findMany({
        orderBy: { sentAt: 'desc' },
        take: 50,
        include: { scan: true },
      });

      if (wantsHtml) {
        return reply.type('text/html').send(renderAlertsPage(alerts));
      }

      return reply.send({ alerts });
    } catch (err) {
      request.log.error({ err }, 'Alerts query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
