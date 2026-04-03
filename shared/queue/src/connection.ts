import { Redis } from 'ioredis';

export { Redis };

export function createRedisConnection(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
  });
}
