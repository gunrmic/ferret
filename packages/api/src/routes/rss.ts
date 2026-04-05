import type { FastifyInstance } from 'fastify';
import { prisma } from '@ferret/db';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function rssRoutes(app: FastifyInstance) {
  app.get('/feed.xml', async (request, reply) => {
    try {
      const scans = await prisma.scan.findMany({
        where: { riskScore: { gt: 0 } },
        orderBy: { id: 'desc' },
        take: 50,
        select: {
          id: true,
          packageName: true,
          version: true,
          riskScore: true,
          scannedAt: true,
          alerted: true,
        },
      });

      const siteUrl = 'https://ferretwatch.dev';
      const now = new Date().toISOString();

      const entries = scans.map((scan) => {
        const url = `${siteUrl}/scan/${encodeURIComponent(scan.packageName)}/${encodeURIComponent(scan.version)}`;
        const title = `${scan.packageName}@${scan.version} — risk score ${scan.riskScore}/100`;
        const updated = new Date(scan.scannedAt).toISOString();

        return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <updated>${updated}</updated>
    <summary>${escapeXml(title)}${scan.alerted ? ' [ALERTED]' : ''}</summary>
  </entry>`;
      });

      const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Ferret Watch — Flagged Scans</title>
  <subtitle>npm supply chain security alerts</subtitle>
  <link href="${siteUrl}/feed.xml" rel="self"/>
  <link href="${siteUrl}"/>
  <id>${siteUrl}/feed.xml</id>
  <updated>${now}</updated>
${entries.join('\n')}
</feed>`;

      return reply.type('application/atom+xml').send(xml);
    } catch (err) {
      request.log.error({ err }, 'RSS feed query failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
