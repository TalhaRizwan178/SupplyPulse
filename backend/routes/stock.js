const express = require('express');
const router  = express.Router();
const StockLevel = require('../models/StockLevel');
const { WarehouseItem } = require('../models/DataSources');
const SystemSetting = require('../models/SystemSetting');
const PendingTrigger = require('../models/PendingTrigger');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

// Apply protection to all stock routes
router.use(authMiddleware, tenantMiddleware);

async function updateWarehouseQty(sku, qty, note, orgId) {
  try {
    await WarehouseItem.findOneAndUpdate(
      { sku, organizationId: orgId },
      { qty_on_hand: qty, note, last_recount_date: new Date().toISOString() },
      { upsert: true }
    );
  } catch (err) {
    console.error(`[updateWarehouseQty] error for sku ${sku}:`, err.message);
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const stocks = await StockLevel.find({ organizationId: req.orgId }).sort({ sku: 1 });
    const { getStatus } = require('../services/stockSimulator');
    const payload = stocks.map(s => ({
      ...s.toObject(),
      pct:    Math.round((s.current_stock / s.initial_stock) * 100),
      status: getStatus ? getStatus(s.current_stock, s.threshold, s.initial_stock)
                        : (s.current_stock <= s.threshold ? 'critical'
                          : s.current_stock <= s.threshold * 1.3 ? 'warning' : 'normal'),
    }));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/reset
router.post('/reset', async (req, res) => {
  try {
    const { SEED_STOCK } = require('../services/stockSimulator');
    for (const seed of SEED_STOCK) {
      await StockLevel.findOneAndUpdate(
        { sku: seed.sku, organizationId: req.orgId },
        {
          organizationId: req.orgId,
          current_stock: seed.initial_stock,
          triggered: false,
          triggered_at: null,
          last_updated: new Date()
        },
        { upsert: true }
      );
      await updateWarehouseQty(seed.sku, seed.initial_stock, 'Demo reset', req.orgId);
    }
    
    // Broadcast to organization room
    const io = req.io;
    if (io) {
      const all = await StockLevel.find({ organizationId: req.orgId });
      const { getStatus } = require('../services/stockSimulator');
      const payload = all.map(s => ({
        ...s.toObject(),
        pct:    Math.round((s.current_stock / s.initial_stock) * 100),
        status: getStatus(s.current_stock, s.threshold, s.initial_stock),
      }));
      io.to(req.orgId.toString()).emit('stock_update', payload);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/adjust — add or remove units from an existing SKU
// body: { sku, amount, reason }   amount > 0 = restock, < 0 = remove
router.post('/adjust', async (req, res) => {
  try {
    const { sku, amount, reason } = req.body;
    if (!sku || amount === undefined) return res.status(400).json({ error: 'sku and amount required' });

    const item = await StockLevel.findOne({ sku, organizationId: req.orgId });
    if (!item) return res.status(404).json({ error: `SKU ${sku} not found` });

    const prev = item.current_stock;
    item.current_stock = Math.max(0, item.current_stock + Number(amount));

    // If restocked above threshold, clear triggered flag so simulator can re-trigger if needed
    if (item.current_stock > item.threshold && item.triggered) {
      item.triggered    = false;
      item.triggered_at = null;
    }

    item.last_updated = new Date();
    await item.save();

    // Sync WarehouseItem in MongoDB
    await WarehouseItem.findOneAndUpdate(
      { sku, organizationId: req.orgId },
      { qty_on_hand: item.current_stock, note: reason || (amount > 0 ? 'Manual restock' : 'Manual removal'), last_recount_date: new Date().toISOString() }
    );

    // Check for threshold breach after manual adjustment
    if (item.current_stock < item.threshold && !item.triggered) {
      item.triggered    = true;
      item.triggered_at = new Date();
      await item.save();

      const setting = await SystemSetting.findOne({ key: 'autoTriggerEnabled', organizationId: req.orgId });
      const autoEnabled = setting ? setting.value === true : false;
      const scenarioId = `MANUAL-ADJ-${item.sku}-${Date.now()}`;
      const io = req.io;

      if (autoEnabled) {
        if (io) io.to(req.orgId.toString()).emit('auto_trigger', {
          sku: item.sku, product_name: item.product_name,
          current_stock: item.current_stock, threshold: item.threshold,
          timestamp: new Date(), autoApproved: true,
        });
        const { runOrchestrator } = require('../agents/orchestrator');
        setImmediate(() =>
          runOrchestrator(scenarioId, io, {
            organizationId: req.orgId,
            sku: item.sku, product_name: item.product_name,
            current_stock: item.current_stock, threshold: item.threshold,
            unit_cost_pkr: item.unit_cost_pkr, supplier: item.supplier,
            auto_triggered: true,
          }).catch(err => console.error('[AdjustTrigger] Orchestrator error:', err.message))
        );
      } else {
        const pending = await PendingTrigger.create({
          organizationId: req.orgId,
          sku: item.sku, product_name: item.product_name,
          current_stock: item.current_stock, threshold: item.threshold,
          unit_cost_pkr: item.unit_cost_pkr, supplier: item.supplier,
          scenarioId,
        });
        if (io) io.to(req.orgId.toString()).emit('pending_trigger', {
          _id: pending._id.toString(),
          sku: item.sku, product_name: item.product_name,
          current_stock: item.current_stock, threshold: item.threshold,
          timestamp: new Date(), autoApproved: false,
        });
        console.log(`[AdjustTrigger] Pending trigger created for ${item.sku} in org ${req.orgId} (manual adjustment)`);
      }
    }

    // Broadcast updated stock to all organization clients
    const io = req.io;
    if (io) {
      const all = await StockLevel.find({ organizationId: req.orgId });
      const { getStatus } = require('../services/stockSimulator');
      const payload = all.map(s => ({
        ...s.toObject(),
        pct:    Math.round((s.current_stock / s.initial_stock) * 100),
        status: getStatus(s.current_stock, s.threshold, s.initial_stock),
      }));
      io.to(req.orgId.toString()).emit('stock_update', payload);
    }

    res.json({ success: true, sku, prev, current: item.current_stock, delta: Number(amount) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/product — add a brand-new product
router.post('/product', async (req, res) => {
  try {
    const { sku, product_name, category, initial_stock, threshold, sales_per_tick, unit_cost_pkr, supplier, warehouse } = req.body;
    if (!sku || !product_name) return res.status(400).json({ error: 'sku and product_name required' });

    const existing = await StockLevel.findOne({ sku, organizationId: req.orgId });
    if (existing) return res.status(409).json({ error: `SKU ${sku} already exists in your organization` });

    const item = await StockLevel.create({
      organizationId: req.orgId,
      sku,
      product_name,
      category:       category || 'General',
      current_stock:  Number(initial_stock) || 0,
      initial_stock:  Number(initial_stock) || 0,
      threshold:      Number(threshold) || 100,
      sales_per_tick: Number(sales_per_tick) || 5,
      unit_cost_pkr:  Number(unit_cost_pkr) || 0,
      supplier:       supplier || '',
      last_updated:   new Date(),
    });

    // Add to WarehouseItem MongoDB
    await WarehouseItem.create({
      organizationId:    req.orgId,
      sku:               item.sku,
      product_name:      item.product_name,
      category:          item.category,
      qty_on_hand:       item.current_stock,
      pending_dispatch:  0,
      reorder_level:     item.threshold,
      last_recount_date: new Date().toISOString(),
      warehouse:         warehouse || 'Central Warehouse Karachi',
      unit_cost_pkr:     item.unit_cost_pkr,
      supplier:          item.supplier,
      note:              'Added manually via SupplyPulse',
    });

    // Broadcast updated stock to all organization clients
    const io = req.io;
    if (io) {
      const all = await StockLevel.find({ organizationId: req.orgId });
      const { getStatus } = require('../services/stockSimulator');
      const payload = all.map(s => ({
        ...s.toObject(),
        pct:    Math.round((s.current_stock / s.initial_stock) * 100),
        status: getStatus(s.current_stock, s.threshold, s.initial_stock),
      }));
      io.to(req.orgId.toString()).emit('stock_update', payload);
    }

    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
