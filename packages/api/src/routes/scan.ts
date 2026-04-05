import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';
import { renderScanDetailPage, renderScanNotFoundPage } from '../views/scan-detail.js';

export async function scanRoutes(app: FastifyInstance) {
  app.get('/scan/:package/:version', async (request, reply) => {
    const { package: packageName, version } = request.params as {
      package: string;
      version: string;
    };

    const decoded = decodeURIComponent(packageName);
    const wantsHtml = request.headers.accept?.includes('text/html');

    try {
      const scan = await prisma.scan.findFirst({
        where: { packageName: decoded, version },
        include: { alerts: true },
      });

      if (!scan) {
        if (wantsHtml) {
          return reply.status(404).type('text/html').send(renderScanNotFoundPage(decoded, version));
        }
        return reply.status(404).send({ error: 'Scan not found' });
      }

      if (wantsHtml) {
        return reply.type('text/html').send(renderScanDetailPage(scan));
      }

      return reply.send(scan);
    } catch (err) {
      request.log.error({ err }, 'Scan query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
