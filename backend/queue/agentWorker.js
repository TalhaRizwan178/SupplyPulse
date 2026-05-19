const { Worker } = require('bullmq');
const connection = require('./redisConnection');
const { runOrchestrator } = require('../agents/orchestrator');

function startWorker(io) {
  const worker = new Worker('agent-orchestration', async (job) => {
    const { scenarioId, organizationId } = job.data;
    console.log(`[Worker] Processing job ${job.id} — scenarioId: ${scenarioId} for org: ${organizationId}`);
    await runOrchestrator(scenarioId, io, { organizationId });
  }, { connection });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
  });

  let errorCount = 0;
  worker.on('error', (err) => {
    errorCount++;
    if (errorCount <= 3) console.error('[Worker] Worker error:', err.message);
    if (errorCount === 3) {
      console.warn('[Worker] Redis unreachable after 3 errors — closing worker. Pipeline runs directly.');
      worker.close().catch(() => {});
    }
  });

  console.log('[Worker] Agent worker started');
  return worker;
}

module.exports = { startWorker };
