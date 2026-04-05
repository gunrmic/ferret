import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';
import { renderScanDetailPage, renderScanNotFoundPage } from '../views/scan-detail.js';

export async function scanRoutes(app: FastifyInstance) {
  // Package history — all scans for a given package
  app.get('/scan/:package', async (request, reply) => {
    const { package: packageName } = request.params as { package: string };
    const decoded = decodeURIComponent(packageName);
    const { limit = '20' } = request.query as Record<string, string>;
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    try {
      const scans = await prisma.scan.findMany({
        where: { packageName: decoded },
        orderBy: { id: 'desc' },
        take,
        select: {
          id: true,
          packageName: true,
          version: true,
          previousVersion: true,
          riskScore: true,
          scannedAt: true,
          alerted: true,
        },
      });

      return reply.send({ package: decoded, scans });
    } catch (err) {
      request.log.error({ err }, 'Package history query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/scan/:package/:version', async (request, reply) => {
    const { package: packageName, version } = request.params as {
      package: string;
      version: string;
    };

    const decoded = decodeURIComponent(packageName);
    const wantsHtml = (request.headers.accept ?? '')
      .split(',')
      .some((part) => part.trim().split(';')[0].trim() === 'text/html');

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
