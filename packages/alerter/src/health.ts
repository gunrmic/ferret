import { createServer, type Server } from 'node:http';
import { logger } from './logger.js';

export function startHealthServer(port: number): Server {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'alerter' }));
  });

  server.listen(port, () => {
    logger.info({ port }, 'Health server listening');
  });

  return server;
}
