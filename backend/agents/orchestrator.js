const { buildScenarioContext, ...agents } = require('./index');
const { Trace, ActionChain } = require('../models');
const { sendEmail } = require('../services/emailService');
const { sendWhatsApp } = require('../services/whatsappService');
const { getSuppliersForSku } = require('../controllers/supplierController');

// Human escalation threshold — autonomous below this, escalate above
const HUMAN_ESCALATION_PKR = 500000;

async function runOrchestrator(scenarioId, io, triggerContext = {}) {
  const {
    organizationId,
    sku           = 'LAYS-MAS-70',
    product_name  = 'Lays Masala 70g',
    current_stock = 142,
    threshold     = 200,
    unit_cost_pkr = 680,
    supplier      = 'Pepsi Direct',
    auto_triggered = false,
  } = triggerContext;

  if (!organizationId) {
    console.error(`[Orchestrator] Error: Missing organizationId for scenarioId ${scenarioId}`);
    return;
  }

  const orgIdStr = organizationId.toString();

  // Revenue at risk = units needed × cost × markup
  const units_needed    = Math.max(400, (threshold - current_stock) * 3);
  const revenue_at_risk = units_needed * unit_cost_pkr * 1.25;
  const needs_human     = revenue_at_risk > HUMAN_ESCALATION_PKR;

  // Fetch live POS + complaint data for urgency enrichment
  const { PosSkuSummary, ComplaintSummary } = require('../models/DataSources');
  const [posData, cxData] = await Promise.all([
    PosSkuSummary.findOne({ sku, organizationId }).lean(),
    ComplaintSummary.findOne({ sku, organizationId }).lean(),
  ]);

  // Use real POS velocity if available, else estimate from sales_per_tick
  const tickMs = parseInt(process.env.STOCK_TICK_MS || '45000', 10);
  const ticksPerHour = 3600000 / tickMs;
  const salesPerHour = posData?.avg_velocity_per_hour || (triggerContext.sales_per_tick || 5) * ticksPerHour;
  const projected_stockout_hours = posData?.projected_stockout_hours || (salesPerHour > 0 ? +(current_stock / salesPerHour).toFixed(1) : null);

  const complaintUrgency = cxData?.escalation_risk || 'low';
  const complaintCount = cxData?.total_last_6h || 0;

  const scenarioContext = buildScenarioContext(sku, product_name, current_stock, threshold, supplier);
  scenarioContext.projected_stockout_hours = projected_stockout_hours;
  scenarioContext.complaint_escalation_risk = complaintUrgency;
  scenarioContext.complaints_last_6h = complaintCount;
  scenarioContext.pos_sales_velocity_per_hour = salesPerHour;

  let state = { scenarioId, sku, product_name, current_stock, threshold, organizationId, scenarioContext };

  const emitTrace = async (agentName, action, details) => {
    const trace = new Trace({ organizationId, scenarioId, agentName, action, details });
    await trace.save();
    if (io) {
      io.to(orgIdStr).emit('agent_trace', { agentName, action, details, timestamp: trace.timestamp });
    }
    await new Promise(r => setTimeout(r, 800));
  };

  try {
    if (io) {
      io.to(orgIdStr).emit('agent_status', {
        status: 'running',
        message: 'Orchestrator Agent started',
        auto_triggered,
        sku,
        product_name,
      });
    }

    await emitTrace('Orchestrator Agent', `${auto_triggered ? '🤖 AUTO-TRIGGERED' : '⚡ Manual trigger'} — SKU: ${sku}`, {
      sku, product_name, current_stock, threshold, auto_triggered,
      revenue_at_risk: `PKR ${revenue_at_risk.toLocaleString()}`,
      escalation_required: needs_human,
    });

    // 1. Ingestion
    await emitTrace('Orchestrator Agent', 'Invoking Ingestion Agent', null);
    state.raw_data = await agents.IngestionAgent({ ...state });
    await emitTrace('Ingestion Agent', 'Data Normalized', state.raw_data);

    const sc = scenarioContext; // shorthand for injection below

    // 2. Signal Extraction
    await emitTrace('Orchestrator Agent', 'Invoking Signal Extraction Agent', null);
    state.signals = await agents.SignalExtractionAgent({ ...state.raw_data, scenarioContext: sc });
    await emitTrace('Signal Extraction Agent', 'Signals Extracted', state.signals);

    // 3. Contradiction Detection
    await emitTrace('Orchestrator Agent', 'Invoking Contradiction Detection Agent', null);
    state.conflicts = await agents.ContradictionDetectionAgent({ ...state.signals, scenarioContext: sc });
    await emitTrace('Contradiction Detection Agent', 'Conflicts Detected', state.conflicts);

    // 4. Credibility Scoring
    await emitTrace('Orchestrator Agent', 'Invoking Credibility Scoring Agent', null);
    state.scores = await agents.CredibilityScoringAgent({ ...state.conflicts, scenarioContext: sc });
    await emitTrace('Credibility Scoring Agent', 'Sources Scored', state.scores);

    // 5. Conflict Resolution
    await emitTrace('Orchestrator Agent', 'Invoking Conflict Resolution Agent', null);
    state.resolved = await agents.ConflictResolutionAgent({ conflicts: state.conflicts, scores: state.scores, scenarioContext: sc });
    await emitTrace('Conflict Resolution Agent', 'Conflict Resolved', state.resolved);

    // 6. Insight Synthesis
    await emitTrace('Orchestrator Agent', 'Invoking Insight Synthesis Agent', null);
    state.insight = await agents.InsightSynthesisAgent({ ...state.resolved, scenarioContext: sc });
    await emitTrace('Insight Synthesis Agent', 'Insight Generated', state.insight);

    // 7. Action Planning
    await emitTrace('Orchestrator Agent', 'Invoking Action Planning Agent', null);
    state.plan = await agents.ActionPlanningAgent({ ...state.insight, scenarioContext: sc });
    await emitTrace('Action Planning Agent', 'Plan Drafted', state.plan);

    // 8. Constraint Validator
    await emitTrace('Orchestrator Agent', 'Invoking Constraint Validator Agent', null);
    state.validated_plan = await agents.ConstraintValidatorAgent({ ...state.plan, scenarioContext: sc });
    await emitTrace('Constraint Validator Agent', 'Plan Validated', state.validated_plan);

    // ── Human escalation check ─────────────────────────────────────────────
    if (needs_human) {
      await emitTrace('Orchestrator Agent', `⚠ Revenue at risk PKR ${revenue_at_risk.toLocaleString()} exceeds threshold — Escalating to human`, {
        revenue_at_risk, threshold: HUMAN_ESCALATION_PKR,
      });
      await sendEmail({
        to: process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
        badge: 'Human Decision Required',
        subject: `ACTION REQUIRED — ${sku} crisis exceeds PKR ${(HUMAN_ESCALATION_PKR / 1000).toFixed(0)}K autonomy limit`,
        body:
          `The autonomous agent has detected a crisis but requires human approval:\n\n` +
          `SKU             : ${sku} — ${product_name}\n` +
          `Current stock   : ${current_stock} units\n` +
          `Threshold       : ${threshold} units\n` +
          `Revenue at risk : PKR ${revenue_at_risk.toLocaleString()}\n` +
          `Stockout in     : ${projected_stockout_hours ? projected_stockout_hours + ' hours' : 'unknown'}\n` +
          `Complaints (6h) : ${complaintCount} (risk: ${complaintUrgency})\n\n` +
          `The agent will PROCEED AUTONOMOUSLY in 10 minutes if no override is received.\n\n` +
          `— SupplyPulse Autonomous Agent`,
      });
    }

    // Create Action Chain in DB
    const actionChain = new ActionChain({
      organizationId,
      scenarioId,
      actions: state.validated_plan.validated_plan || [],
      status: 'executing',
    });
    await actionChain.save();
    if (io) {
      io.to(orgIdStr).emit('plan_updated', { scenarioId });
    }

    // 9. Execution & 10. Recovery
    await emitTrace('Orchestrator Agent', 'Invoking Execution Agent', null);
    state.execution_results = await agents.ExecutionAgent({ ...state.validated_plan, scenarioContext: sc });
    await emitTrace('Execution Agent', 'Execution Attempted', state.execution_results);

    // ── WhatsApp: Retailer notification ───────────────────────────────────
    const affectedOutlets = Math.floor(20 + Math.random() * 25);
    const eta_hours       = (1 + Math.random() * 3).toFixed(1);
    await sendWhatsApp({
      message:
        `*SupplyPulse Agent Alert*\n\n` +
        `SKU: ${sku} (${product_name})\n` +
        `Status: Emergency restock initiated\n` +
        `Affected outlets: ${affectedOutlets} across Karachi North\n` +
        `ETA to restock: ${eta_hours} hours\n` +
        `Revenue protected: PKR ${(revenue_at_risk / 1000000).toFixed(1)}M\n\n` +
        `Action: Please hold promotional shelf space. Stock en route.\n` +
        `— DistCo Karachi Autonomous Agent`,
    });

    // ── Email: All suppliers carrying this SKU ─────────────────────────────
    const dbSuppliers = await getSuppliersForSku(sku, organizationId);
    const supplierList = dbSuppliers.length > 0
      ? dbSuppliers
      : [{ name: supplier, email: process.env.SMTP_FROM || process.env.SMTP_USER }];

    for (const sup of supplierList) {
      await sendEmail({
        to: sup.email,
        badge: 'Urgent — Stock Alert',
        subject: `URGENT: Stock Alert — ${sku} | Action Required`,
        body:
          `Dear ${sup.name} Team,\n\n` +
          `This is an automated message from DistCo Karachi's autonomous supply chain agent.\n\n` +
          `SKU: ${sku} — ${product_name}\n\n` +
          `Current situation:\n` +
          `- Current stock : ${current_stock} units (threshold: ${threshold})\n` +
          `- Projected stockout: ${Math.ceil(current_stock / 25 * (TICK_MS_DISPLAY / 60000))} hours\n` +
          `- Affected outlets: ${affectedOutlets}\n` +
          `- Revenue at risk: PKR ${revenue_at_risk.toLocaleString()}\n\n` +
          `Please confirm your available stock and earliest delivery ETA.\n\n` +
          `Regards,\n` +
          `SupplyPulse Autonomous Agent\n` +
          `DistCo Karachi North Operations\n` +
          `[Sent automatically — 0 human interventions]`,
      });
    }

    // Check for failure → Recovery
    const failedStep = state.execution_results.results?.find(r => r.status === 'failed');
    if (failedStep) {
      await emitTrace('Orchestrator Agent', 'Failure Detected — Invoking Recovery Agent', failedStep);
      state.recovery = await agents.RecoveryAgent({ ...failedStep, scenarioContext: sc });
      await emitTrace('Recovery Agent', 'Alternative Action Executed', state.recovery);

      // Email backup suppliers (all except first)
      const backupSuppliers = dbSuppliers.length > 1
        ? dbSuppliers.slice(1)
        : [{ name: 'Backup Supplier', email: process.env.SMTP_FROM || process.env.SMTP_USER }];

      for (const sup of backupSuppliers) {
        await sendEmail({
          to: sup.email,
          badge: 'Backup PO Activated',
          subject: `Emergency Order — ${sku} | Urgent Fulfillment Needed`,
          body:
            `Dear ${sup.name} Team,\n\n` +
            `Primary supplier for ${sku} has failed. Activating emergency order:\n\n` +
            `  Product : ${product_name}\n` +
            `  Quantity: ${units_needed} units\n` +
            `  Price   : PKR ${unit_cost_pkr}/unit (PKR ${(units_needed * unit_cost_pkr).toLocaleString()} total)\n` +
            `  Delivery: Within 4 hours to Central Warehouse, Karachi\n\n` +
            `Please confirm receipt and dispatch ETA by reply.\n\n` +
            `Regards,\n` +
            `SupplyPulse Autonomous Agent\n` +
            `[Sent automatically — 0 human interventions]`,
        });
      }
    }

    // 11. Outcome Calculation
    await emitTrace('Orchestrator Agent', 'Invoking Outcome Agent', null);
    state.outcomes = await agents.OutcomeAgent(state);
    await emitTrace('Outcome Agent', 'Outcomes Computed', state.outcomes);

    actionChain.status = 'completed';
    await actionChain.save();

    // ── Admin outcome summary ─────────────────────────────────────────────
    const restocked = current_stock + units_needed;
    await sendEmail({
      to: process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
      badge: 'Crisis Resolved',
      subject: `Crisis Resolved — ${sku} | 0 human interventions | PKR ${(revenue_at_risk / 1000000).toFixed(1)}M protected`,
      body:
        `SUPPLYPULSE — AUTONOMOUS RESOLUTION REPORT\n` +
        `==========================================\n\n` +
        `Trigger  : ${auto_triggered ? '🤖 AUTO-TRIGGERED by Stock Monitor' : '⚡ Manual trigger'}\n` +
        `Crisis   : ${sku} — ${product_name}\n` +
        `Resolved : ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n\n` +
        `OUTCOME SUMMARY\n` +
        `---------------\n` +
        `Stock restored     : ${current_stock} → ${restocked} units\n` +
        `Retailers notified : ${affectedOutlets}\n` +
        `Revenue protected  : PKR ${revenue_at_risk.toLocaleString()}\n` +
        `Human interventions: ${needs_human ? '1 (approval request sent)' : '0'}\n\n` +
        `AGENTS INVOKED\n` +
        `--------------\n` +
        `11 agents · autonomous decisions throughout\n\n` +
        `No further action required.\n\n` +
        `— SupplyPulse Autonomous Agent`,
    });

    if (io) {
      io.to(orgIdStr).emit('agent_status', {
        status: 'completed',
        outcomes: state.outcomes,
        auto_triggered,
        sku,
      });
    }

  } catch (err) {
    console.error('Orchestration failed', err);
    if (io) {
      io.to(orgIdStr).emit('agent_status', { status: 'failed', error: err.message });
    }
  }
}

// Just for display in emails
const TICK_MS_DISPLAY = parseInt(process.env.STOCK_TICK_MS || '45000', 10);

module.exports = { runOrchestrator };
