const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

// Protect agents routes
router.use(authMiddleware, tenantMiddleware);

router.post('/trigger', async (req, res) => {
  try {
    const { scenarioId } = req.body;
    const id = scenarioId || `SCENARIO-${Date.now()}`;

    // Try BullMQ queue first; fall back to direct execution if Redis is down
    let queued = false;
    try {
      const agentQueue = require('../queue/agentQueue');
      await agentQueue.add('run-orchestrator', {
        scenarioId: id,
        organizationId: req.orgId,
      }, {
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
      });
      queued = true;
      console.log(`[Agent] Job queued via BullMQ — scenarioId: ${id} for org: ${req.orgId}`);
    } catch (queueErr) {
      console.warn(`[Agent] Redis unavailable (${queueErr.message}) — running orchestrator directly`);
    }

    if (!queued) {
      // Run directly in background (non-blocking)
      const { runOrchestrator } = require('../agents/orchestrator');
      const io = req.io;
      setImmediate(() => runOrchestrator(id, io, { organizationId: req.orgId }));
      console.log(`[Agent] Orchestrator started directly — scenarioId: ${id} for org: ${req.orgId}`);
    }

    res.json({ success: true, message: queued ? 'Agent job queued' : 'Agent running directly', scenarioId: id });
  } catch (error) {
    console.error('Agent trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
