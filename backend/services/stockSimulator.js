/**
 * stockSimulator.js
 * -----------------
 * Simulates real sales velocity by decrementing stock in MongoDB every tick.
 * When any SKU drops below threshold:
 *   - if autoTriggerEnabled (DB setting): fires orchestrator immediately
 *   - if disabled: creates a PendingTrigger and emits 'pending_trigger' for user approval
 * All state lives in MongoDB — safe for deployment (no filesystem).
 */

const StockLevel = require('../models/StockLevel');
const SystemSetting = require('../models/SystemSetting');
const PendingTrigger = require('../models/PendingTrigger');
const { PosSkuSummary } = require('../models/DataSources');

// Tick interval in ms. Override with STOCK_TICK_MS in .env.
const TICK_MS = parseInt(process.env.STOCK_TICK_MS || '45000', 10);

// Auto-reset triggered flag after this many ms so demo can repeat
const RESET_TRIGGER_AFTER_MS = 30 * 60 * 1000; // 30 minutes

// Initial seed data — realistic Pakistani FMCG distribution
const SEED_STOCK = [
  { sku: 'LAYS-MAS-70',    product_name: 'Lays Masala 70g',          category: 'Snacks',    current_stock: 320, initial_stock: 320, threshold: 200, sales_per_tick: 25, unit_cost_pkr: 680,  supplier: 'Pepsi Direct' },
  { sku: 'STING-250',      product_name: 'Sting Energy 250ml',       category: 'Beverages', current_stock: 210, initial_stock: 210, threshold: 120, sales_per_tick: 14, unit_cost_pkr: 90,   supplier: 'Pepsi Direct' },
  { sku: 'LAYS-FRENCH-70', product_name: 'Lays French Cheese 70g',   category: 'Snacks',    current_stock: 480, initial_stock: 480, threshold: 150, sales_per_tick: 10, unit_cost_pkr: 680,  supplier: 'Pepsi Direct' },
  { sku: 'OLPER-MILK-1L',  product_name: "Olper's Full Cream 1L",    category: 'Dairy',     current_stock: 560, initial_stock: 560, threshold: 180, sales_per_tick: 8,  unit_cost_pkr: 230,  supplier: 'Engro Foods'  },
  { sku: 'PEPSI-RG-500',   product_name: 'Pepsi Regular 500ml',      category: 'Beverages', current_stock: 980, initial_stock: 980, threshold: 400, sales_per_tick: 18, unit_cost_pkr: 120,  supplier: 'Pepsi Direct' },
  { sku: 'KURKURE-MAS-42', product_name: 'Kurkure Masala Munch 42g', category: 'Snacks',    current_stock: 620, initial_stock: 620, threshold: 250, sales_per_tick: 7,  unit_cost_pkr: 420,  supplier: 'Pepsi Direct' },
];

async function seedStockIfEmpty(orgId) {
  const count = await StockLevel.countDocuments({ organizationId: orgId });
  if (count > 0) return;
  const seeded = SEED_STOCK.map(item => ({ ...item, organizationId: orgId }));
  await StockLevel.insertMany(seeded);
  console.log(`[StockSim] Seeded initial stock levels for org: ${orgId}`);
}

async function getAutoTriggerEnabled(orgId) {
  const setting = await SystemSetting.findOne({ key: 'autoTriggerEnabled', organizationId: orgId });
  return setting ? setting.value === true : false; // default: false (manual mode)
}

function startSimulator(io) {
  let orchestratorRef = null;
  const getOrchestrator = () => {
    if (!orchestratorRef) orchestratorRef = require('../agents/orchestrator').runOrchestrator;
    return orchestratorRef;
  };

  const tick = async () => {
    try {
      const stocks = await StockLevel.find();

      const ticksPerHour = 3600000 / TICK_MS;

      for (const item of stocks) {
        const variance = 0.8 + Math.random() * 0.4;
        const sold = Math.round(item.sales_per_tick * variance);
        const newStock = Math.max(0, item.current_stock - sold);

        item.current_stock = newStock;
        item.last_updated  = new Date();

        // Auto-reset triggered flag after cooldown
        if (item.triggered && item.triggered_at) {
          const elapsed = Date.now() - new Date(item.triggered_at).getTime();
          if (elapsed > RESET_TRIGGER_AFTER_MS) {
            item.triggered    = false;
            item.triggered_at = null;
            item.current_stock = item.initial_stock;
            console.log(`[StockSim] Reset ${item.sku} — restocked to ${item.initial_stock} for org: ${item.organizationId}`);
          }
        }

        await item.save();

        // Update PosSkuSummary with real sales velocity from this tick
        const instantVelocity = sold * ticksPerHour;
        const existing = await PosSkuSummary.findOne({ sku: item.sku, organizationId: item.organizationId });
        const avgVelocity = existing?.avg_velocity_per_hour
          ? +(0.8 * existing.avg_velocity_per_hour + 0.2 * instantVelocity).toFixed(2)
          : +instantVelocity.toFixed(2);
        const projectedStockoutHours = avgVelocity > 0
          ? +(newStock / avgVelocity).toFixed(2)
          : null;

        await PosSkuSummary.findOneAndUpdate(
          { sku: item.sku, organizationId: item.organizationId },
          {
            organizationId: item.organizationId,
            sku: item.sku,
            avg_velocity_per_hour: avgVelocity,
            projected_stockout_hours: projectedStockoutHours,
            last_updated: new Date(),
          },
          { upsert: true }
        );
      }

      // Group stocks by organizationId to emit isolated updates
      const orgGroups = {};
      for (const s of stocks) {
        const orgId = s.organizationId.toString();
        if (!orgGroups[orgId]) orgGroups[orgId] = [];
        orgGroups[orgId].push({
          sku:            s.sku,
          product_name:   s.product_name,
          category:       s.category,
          current_stock:  s.current_stock,
          initial_stock:  s.initial_stock,
          threshold:      s.threshold,
          sales_per_tick: s.sales_per_tick,
          unit_cost_pkr:  s.unit_cost_pkr,
          supplier:       s.supplier,
          triggered:      s.triggered,
          last_updated:   s.last_updated,
          pct:            Math.round((s.current_stock / s.initial_stock) * 100),
          status:         getStatus(s.current_stock, s.threshold, s.initial_stock),
        });
      }

      // Broadcast live stock update to each connected organization room
      for (const [orgId, payload] of Object.entries(orgGroups)) {
        io.to(orgId).emit('stock_update', payload);
      }

      // Monitor: check for threshold breaches
      for (const item of stocks) {
        if (item.current_stock < item.threshold && !item.triggered) {
          const autoTriggerEnabled = await getAutoTriggerEnabled(item.organizationId);
          console.log(`\n[StockMonitor] ${item.sku} breached threshold in org ${item.organizationId} (${item.current_stock} < ${item.threshold}) — autoTrigger=${autoTriggerEnabled}\n`);

          item.triggered    = true;
          item.triggered_at = new Date();
          await item.save();

          const scenarioId = `AUTO-${item.sku}-${Date.now()}`;

          if (autoTriggerEnabled) {
            // Auto-mode: fire immediately without user approval
            io.to(item.organizationId.toString()).emit('auto_trigger', {
              sku:           item.sku,
              product_name:  item.product_name,
              current_stock: item.current_stock,
              threshold:     item.threshold,
              timestamp:     new Date(),
              autoApproved:  true,
            });

            const runOrchestrator = getOrchestrator();
            setImmediate(() =>
              runOrchestrator(scenarioId, io, {
                organizationId: item.organizationId,
                sku:            item.sku,
                product_name:   item.product_name,
                current_stock:  item.current_stock,
                threshold:      item.threshold,
                unit_cost_pkr:  item.unit_cost_pkr,
                supplier:       item.supplier,
                auto_triggered: true,
              }).catch(err => console.error('[StockMonitor] Orchestrator error:', err.message))
            );
          } else {
            // Manual-approval mode: create pending trigger and notify
            const pending = await PendingTrigger.create({
              organizationId: item.organizationId,
              sku:           item.sku,
              product_name:  item.product_name,
              current_stock: item.current_stock,
              threshold:     item.threshold,
              unit_cost_pkr: item.unit_cost_pkr,
              supplier:      item.supplier,
              scenarioId,
            });

            io.to(item.organizationId.toString()).emit('pending_trigger', {
              _id:           pending._id.toString(),
              sku:           item.sku,
              product_name:  item.product_name,
              current_stock: item.current_stock,
              threshold:     item.threshold,
              timestamp:     new Date(),
              autoApproved:  false,
            });

            console.log(`[StockMonitor] Pending trigger created for ${item.sku} in org ${item.organizationId} (approval required)`);
          }
        }
      }

    } catch (err) {
      console.error('[StockSim] Tick error:', err.message);
    }
  };

  setTimeout(tick, 3000);
  setInterval(tick, TICK_MS);

  console.log(`[StockSim] Started — tick every ${TICK_MS / 1000}s`);
}

function getStatus(current, threshold, initial) {
  const pct = current / initial;
  if (current <= threshold)        return 'critical';
  if (current <= threshold * 1.3)  return 'warning';
  if (pct < 0.4)                   return 'low';
  return 'normal';
}

module.exports = { startSimulator, seedStockIfEmpty, SEED_STOCK, getStatus };
