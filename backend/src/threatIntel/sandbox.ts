import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { validateUrl } from '../utils/ssrfGuard';

const connection = new IORedis({ host: process.env.REDIS_HOST || 'redis', maxRetriesPerRequest: null });

export const sandboxQueue = new Queue('sandbox', { connection });
const queueEvents = new QueueEvents('sandbox', { connection });
// QueueScheduler is no longer needed in BullMQ 5.x

new Worker('sandbox', async job => {
  const { url } = job.data;
  const screenshotName = `${Date.now()}_${url.replace(/[^a-zA-Z0-9]/g,'_')}.png`;
  const res = await axios.post(
    `${process.env.SANDBOX_URL}/analyze`,
    { url, screenshotPath: `/app/screenshots/${screenshotName}` },
    { timeout: 30000 }
  );
  return { ...res.data, screenshotPath: `/app/screenshots/${screenshotName}` };
}, { connection, concurrency: 2 });

export async function runSandbox(url: string): Promise<any> {
  if (!validateUrl(url)) throw new Error('URL blocked by SSRF guard');
  const job = await sandboxQueue.add('analyze', { url }, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 }
  });
  return job.waitUntilFinished(queueEvents);
}
