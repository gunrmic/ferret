import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

export async function scanRoutes(app: FastifyInstance) {
  app.get('/scan/:package/:version', async (request, reply) => {
    const { package: packageName, version } = request.params as {
      package: string;
      version: string;
    };

    const decoded = decodeURIComponent(packageName);

    const scan = await prisma.scan.findFirst({
      where: { packageName: decoded, version },
      include: { alerts: true },
    });

    if (!scan) {
      return reply.status(404).send({ error: 'Scan not found' });
    }

    return reply.send(scan);
  });
}
