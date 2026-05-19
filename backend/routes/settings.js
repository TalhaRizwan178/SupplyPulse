const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const PendingTrigger = require('../models/PendingTrigger');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

// Protect all routes in settings
router.use(authMiddleware, tenantMiddleware);

// GET /api/settings — return all settings as a flat object for this org
router.get('/', async (req, res) => {
  try {
    const docs = await SystemSetting.find({ organizationId: req.orgId });
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    // Defaults
    if (settings.autoTriggerEnabled === undefined) settings.autoTriggerEnabled = false;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings — upsert a setting { key, value } for this org
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await SystemSetting.findOneAndUpdate(
      { key, organizationId: req.orgId },
      { value, organizationId: req.orgId },
      { upsert: true, new: true }
    );

    // When auto-trigger is turned ON, fire all pending manual triggers immediately for this org
    if (key === 'autoTriggerEnabled' && value === true) {
      const pending = await PendingTrigger.find({ approved: false, rejected: false, organizationId: req.orgId });
      if (pending.length > 0) {
        const io = req.io;
        const { runOrchestrator } = require('../agents/orchestrator');

        for (const trigger of pending) {
          trigger.approved = true;
          await trigger.save();

          const scenarioId = trigger.scenarioId || `AUTO-ENABLE-${trigger.sku}-${Date.now()}`;
          setImmediate(() =>
            runOrchestrator(scenarioId, io, {
              organizationId: req.orgId,
              sku:            trigger.sku,
              product_name:   trigger.product_name,
              current_stock:  trigger.current_stock,
              threshold:      trigger.threshold,
              unit_cost_pkr:  trigger.unit_cost_pkr,
              supplier:       trigger.supplier,
              auto_triggered: true,
            }).catch(err => console.error('[AutoEnable] error:', err.message))
          );

          if (io) io.to(req.orgId.toString()).emit('trigger_approved', { triggerId: trigger._id.toString(), sku: trigger.sku });
        }

        console.log(`[Settings] Auto-trigger enabled — fired ${pending.length} pending trigger(s) for org ${req.orgId}`);
      }
    }

    res.json({ ok: true, key, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/pending-triggers — list unapproved pending triggers for this org
router.get('/pending-triggers', async (req, res) => {
  try {
    const pending = await PendingTrigger.find({ approved: false, rejected: false, organizationId: req.orgId }).sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/pending-triggers/:id/approve — approve and run orchestrator
router.post('/pending-triggers/:id/approve', async (req, res) => {
  try {
    const trigger = await PendingTrigger.findOne({ _id: req.params.id, organizationId: req.orgId });
    if (!trigger) return res.status(404).json({ error: 'Not found' });
    if (trigger.approved) return res.json({ ok: true, message: 'Already approved' });

    trigger.approved = true;
    await trigger.save();

    const io = req.io;
    const { runOrchestrator } = require('../agents/orchestrator');
    const scenarioId = trigger.scenarioId || `MANUAL-APPROVE-${trigger.sku}-${Date.now()}`;

    setImmediate(() =>
      runOrchestrator(scenarioId, io, {
        organizationId: req.orgId,
        sku:            trigger.sku,
        product_name:   trigger.product_name,
        current_stock:  trigger.current_stock,
        threshold:      trigger.threshold,
        unit_cost_pkr:  trigger.unit_cost_pkr,
        supplier:       trigger.supplier,
        auto_triggered: false,
      }).catch(err => console.error('[ApproveTriger] error:', err.message))
    );

    if (io) {
      io.to(req.orgId.toString()).emit('trigger_approved', { triggerId: trigger._id.toString(), sku: trigger.sku });
    }

    res.json({ ok: true, message: 'Approved — agent pipeline started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/pending-triggers/:id/reject
router.post('/pending-triggers/:id/reject', async (req, res) => {
  try {
    await PendingTrigger.findOneAndUpdate({ _id: req.params.id, organizationId: req.orgId }, { rejected: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
