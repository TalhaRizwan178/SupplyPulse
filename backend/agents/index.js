const { callAgent } = require('../services/groq');
const {
  WarehouseItem, PosOutlet, PosSkuSummary,
  SupplierEmailThread, Complaint, ComplaintSummary,
  NewsArticle, FeedMeta,
} = require('../models/DataSources');

// ─────────────────────────────────────────────────────────────────────────────
// DATA LOADER — queries MongoDB at runtime for the triggered SKU
// ─────────────────────────────────────────────────────────────────────────────

async function buildSources(sku) {
  const [
    whRow, posSku, allWh,
    posOutlets, posMeta,
    mainThread, strikeAlert,
    cxSummary, complaints,
    topNews, newsMeta,
  ] = await Promise.all([
    WarehouseItem.findOne({ sku }).lean(),
    PosSkuSummary.findOne({ sku }).lean(),
    WarehouseItem.find({}).lean(),
    PosOutlet.find({ 'skus.sku': sku }).lean(),
    FeedMeta.findOne({ source: 'pos' }).lean(),
    SupplierEmailThread.findOne({ sku }).lean(),
    SupplierEmailThread.findOne({ thread_id: 'TH-ALERT-01' }).lean(),
    ComplaintSummary.findOne({ sku }).lean(),
    Complaint.find({ sku }).lean(),
    NewsArticle.find({ severity: { $in: ['high', 'critical'] } }).lean(),
    FeedMeta.findOne({ source: 'news' }).lean(),
  ]);

  const wh = whRow || {};
  const ps = posSku || {};

  // Other SKUs below reorder from live warehouse data
  const otherLowStock = allWh
    .filter(r => r.sku !== sku && r.qty_on_hand <= r.reorder_level)
    .map(r => ({ sku: r.sku, qty: r.qty_on_hand, note: r.note }));

  // Outlets with zero stock for this SKU
  const zeroStockOutlets = posOutlets
    .filter(o => o.skus.find(s => s.sku === sku && s.shelf_units === 0))
    .map(o => o.name);

  const MOCK_SOURCES = {
    warehouse_csv: {
      source_id: 'WH',
      source_type: 'warehouse_spreadsheet',
      label: 'warehouse.csv',
      last_synced: wh.last_recount_date || new Date().toISOString(),
      total_skus_in_file: allWh.length,
      data: {
        sku:               wh.sku,
        product_name:      wh.product_name,
        qty_on_hand:       wh.qty_on_hand || 0,
        location:          wh.warehouse,
        last_recount_date: wh.last_recount_date,
        pending_dispatch:  wh.pending_dispatch || 0,
        reorder_level:     wh.reorder_level || 200,
        supplier:          wh.supplier,
        note:              wh.note,
        other_low_stock_skus: otherLowStock,
      },
    },

    pos_feed: {
      source_id: 'PS',
      source_type: 'point_of_sale',
      label: 'pos.feed',
      last_synced: posMeta?.meta?.feed_timestamp,
      total_outlets_reporting: posMeta?.meta?.total_reporting_outlets,
      data: {
        sku:                        ps.sku,
        product_name:               ps.product_name,
        sales_velocity_per_hour:    ps.avg_velocity_per_hour,
        units_sold_last_24h:        ps.units_sold_last_24h,
        units_sold_last_6h:         ps.units_sold_last_6h,
        shelf_units_remaining:      ps.total_shelf_units_across_outlets,
        projected_stockout_hours:   ps.projected_stockout_hours,
        active_outlets_reporting:   posMeta?.meta?.total_reporting_outlets,
        outlets_showing_zero_stock: ps.outlets_at_zero_stock,
        revenue_last_24h_pkr:       ps.revenue_last_24h_pkr,
        zero_stock_outlets:         zeroStockOutlets,
      },
    },

    supplier_email: {
      source_id: 'SP',
      source_type: 'supplier_email',
      label: 'supplier.email',
      last_synced: mainThread?.latest_message_at,
      data: {
        supplier_name:    mainThread?.supplier,
        subject:          mainThread?.subject,
        body:             mainThread?.messages?.[mainThread.messages.length - 1]?.body,
        units_in_transit: mainThread?.units_confirmed,
        promised_eta:     mainThread?.promised_eta,
        lr_number:        mainThread?.lr_number,
        confidence:       mainThread?.confidence,
        risk_flags:       mainThread?.risk_flags,
        disruption_alert: {
          subject:      strikeAlert?.subject,
          affected_skus: strikeAlert?.affected_skus,
          impact:        strikeAlert?.impact,
          received_at:   strikeAlert?.latest_message_at,
        },
        backup_supplier: {
          name:               'Mehran Foods (Supplier B)',
          draft_po:           'PO-DRAFT-B-4822',
          units_available:    400,
          price_per_unit_pkr: 800,
          lead_time_hours:    4,
        },
      },
    },

    complaints_feed: {
      source_id: 'CX',
      source_type: 'customer_complaints',
      label: 'complaints.feed',
      data: {
        sku,
        total_complaints_last_6h:  cxSummary?.total_last_6h,
        total_complaints_last_24h: cxSummary?.total_last_24h,
        out_of_stock_reports:      cxSummary?.out_of_stock_reports,
        low_stock_warnings:        cxSummary?.low_stock_warnings,
        complaint_type:            'out_of_stock',
        dominant_sentiment:        cxSummary?.dominant_sentiment,
        escalation_risk:           cxSummary?.escalation_risk,
        affected_outlets: complaints
          .filter(c => c.type === 'out_of_stock')
          .map(c => c.outlet)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 8),
        sample_complaints: complaints
          .slice(0, 3)
          .map(c => ({ channel: c.channel, message: c.message, sentiment: c.sentiment })),
      },
    },

    news_scrape: {
      source_id: 'NW',
      source_type: 'news_article',
      label: 'news.scrape',
      last_synced: newsMeta?.meta?.scrape_timestamp,
      total_articles: topNews.length,
      data: {
        headline:    topNews[0]?.headline,
        source_outlet: topNews[0]?.outlet,
        published_at: topNews[0]?.published_at,
        summary:     topNews[0]?.summary,
        articles:    topNews.map(a => ({
          headline:    a.headline,
          outlet:      a.outlet,
          published_at: a.published_at,
          severity:    a.severity,
          credibility: a.credibility,
          tags:        a.tags,
        })),
        affected_brands:       topNews[0]?.affected_brands || [],
        logistics_impact:      'N-55 blocked — primary artery for Lahore-to-Karachi supply chain',
        strike_duration_estimate: '24-72 hours',
        risk_summary:          newsMeta?.meta?.risk_summary,
      },
    },
  };

  return MOCK_SOURCES;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA SOURCES — built from real files, same structure agents expect
// ─────────────────────────────────────────────────────────────────────────────

// SCENARIO_CONTEXT is built dynamically per run — see buildScenarioContext()
function buildScenarioContext(sku, product_name, current_stock, threshold, supplier) {
  return {
    distributor: 'DistCo Karachi North',
    region: 'Karachi North — 38 active retail outlets',
    sku,
    product: product_name,
    current_stock,
    threshold,
    budget_cap_pkr: 500000,
    primary_supplier: supplier || 'Pepsi Direct (Supplier A)',
    backup_supplier: 'Mehran Foods (Supplier B)',
    backup_supplier_price_per_unit_pkr: 800,
    primary_supplier_price_per_unit_pkr: 780,
    units_needed: Math.max(400, (threshold - current_stock) * 3),
    current_date: new Date().toISOString().split('T')[0],
    escalation_threshold_hours: 12,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────────────────────────────

const agents = {

  IngestionAgent: async (input) => {
    // Build live sources and context from MongoDB for this specific SKU
    const liveSources  = await buildSources(input.sku || 'LAYS-MAS-70');
    const liveScenario = buildScenarioContext(
      input.sku, input.product_name, input.current_stock, input.threshold, input.supplier
    );

    const prompt = `You are the Ingestion Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify(liveScenario)}

YOUR JOB:
You receive raw data from 5 sources. Normalize each source into a standard format. Assign a preliminary credibility score (0.0–1.0) to each source based on:
- recency (how fresh the data is)
- source_type reliability (POS feeds > emails > warehouse spreadsheets > news)
- internal consistency

OUTPUT FORMAT (strict JSON):
{
  "normalized_sources": [
    {
      "source_id": string,
      "source_type": string,
      "label": string,
      "sku": "LAYS-MAS-70",
      "key_metric": string,
      "key_value": any,
      "timestamp": ISO string,
      "preliminary_credibility": number,
      "flags": string[]
    }
  ],
  "ingestion_summary": string
}

RULES:
- DO NOT ask for more information. Work with what you have.
- If a source is stale (>2h old), add flag "stale_data".
- If a source contradicts another on the same metric, add flag "potential_conflict".
- Return valid JSON only.`;

    const mockResponse = {
      normalized_sources: [
        {
          source_id: 'WH',
          source_type: 'warehouse_spreadsheet',
          label: 'warehouse.csv',
          sku: 'LAYS-MAS-70',
          key_metric: 'qty_on_hand',
          key_value: 412,
          timestamp: '2026-05-18T07:00:00Z',
          preliminary_credibility: 0.52,
          flags: ['stale_data', 'potential_conflict', 'pending_dispatch_not_deducted']
        },
        {
          source_id: 'PS',
          source_type: 'point_of_sale',
          label: 'pos.feed',
          sku: 'LAYS-MAS-70',
          key_metric: 'shelf_units_remaining',
          key_value: 142,
          timestamp: '2026-05-18T09:58:00Z',
          preliminary_credibility: 0.91,
          flags: ['real_time', 'high_velocity_drain']
        },
        {
          source_id: 'SP',
          source_type: 'supplier_email',
          label: 'supplier.email',
          sku: 'LAYS-MAS-70',
          key_metric: 'units_in_transit',
          key_value: 800,
          timestamp: '2026-05-18T09:00:00Z',
          preliminary_credibility: 0.65,
          flags: ['potential_conflict', 'eta_unverified_against_strike']
        },
        {
          source_id: 'CX',
          source_type: 'customer_complaints',
          label: 'complaints.feed',
          sku: 'LAYS-MAS-70',
          key_metric: 'outlets_reporting_stockout',
          key_value: 6,
          timestamp: '2026-05-18T09:45:00Z',
          preliminary_credibility: 0.78,
          flags: ['corroborates_pos', 'phantom_inventory_signal']
        },
        {
          source_id: 'NW',
          source_type: 'news_article',
          label: 'news.scrape',
          sku: 'LAYS-MAS-70',
          key_metric: 'supply_chain_risk',
          key_value: 'factory_strike_lahore',
          timestamp: '2026-05-18T06:00:00Z',
          preliminary_credibility: 0.38,
          flags: ['single_source', 'unconfirmed_by_supplier', 'high_impact_if_true']
        }
      ],
      ingestion_summary: 'Ingested 5 sources for LAYS-MAS-70. POS feed (freshest, 8s ago) shows 142 units with 2.4h to stockout. Warehouse CSV is 3h stale and likely overcounts by 270 (undeducted dispatch). Supplier email promises 800 units by Thu PM but news reports factory strike. CX complaints corroborate POS. Conflicts detected on stock_count and supplier_eta metrics.'
    };

    return await callAgent('IngestionAgent', prompt, liveSources, mockResponse);
  },

  SignalExtractionAgent: async (input) => {
    const prompt = `You are the Signal Extraction Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Normalized source data from the Ingestion Agent.

YOUR JOB:
Extract actionable demand, supply, and risk signals from the normalized sources. Apply temporal weighting (recent data matters more). Each signal must cite its source.

OUTPUT FORMAT (strict JSON):
{
  "signals": [
    {
      "signal_id": string,
      "type": "demand" | "supply" | "risk" | "operational",
      "severity": "critical" | "high" | "medium" | "low",
      "sku": string,
      "description": string,
      "source_ids": string[],
      "metric": string,
      "value": any,
      "temporal_weight": number,
      "recommended_urgency_hours": number
    }
  ],
  "overall_risk_score": number,
  "extraction_summary": string
}

RULES:
- Be specific. Do not return vague signals.
- A signal with temporal_weight < 0.4 should have lower severity unless corroborated.
- Cross-reference signals. If CX complaints corroborate POS data, note the corroboration.
- Return valid JSON only.`;

    const mockResponse = {
      signals: [
        {
          signal_id: 'SIG-001',
          type: 'demand',
          severity: 'critical',
          sku: 'LAYS-MAS-70',
          description: 'POS velocity at 58 units/hour with only 142 units on shelf. Projected stockout in 2.4 hours at current drain rate.',
          source_ids: ['PS', 'CX'],
          metric: 'time_to_stockout_hours',
          value: 2.4,
          temporal_weight: 0.97,
          recommended_urgency_hours: 2
        },
        {
          signal_id: 'SIG-002',
          type: 'supply',
          severity: 'high',
          sku: 'LAYS-MAS-70',
          description: 'Warehouse CSV reports 412 units but 270 pending dispatch not yet deducted. Actual available stock likely ~142 units matching POS.',
          source_ids: ['WH', 'PS'],
          metric: 'actual_available_stock',
          value: 142,
          temporal_weight: 0.55,
          recommended_urgency_hours: 4
        },
        {
          signal_id: 'SIG-003',
          type: 'risk',
          severity: 'high',
          sku: 'LAYS-MAS-70',
          description: 'PepsiCo factory strike in Lahore. N-55 road blockage. Supplier A ETA of Thu PM is at serious risk. Supply chain disruption likely.',
          source_ids: ['NW', 'SP'],
          metric: 'supplier_eta_reliability',
          value: 'unreliable',
          temporal_weight: 0.72,
          recommended_urgency_hours: 6
        },
        {
          signal_id: 'SIG-004',
          type: 'operational',
          severity: 'medium',
          sku: 'LAYS-MAS-70',
          description: '6 customer complaints across premium outlets confirm phantom inventory — system shows stock but shelves are empty.',
          source_ids: ['CX', 'PS'],
          metric: 'phantom_inventory_outlets',
          value: 6,
          temporal_weight: 0.84,
          recommended_urgency_hours: 3
        }
      ],
      overall_risk_score: 0.87,
      extraction_summary: 'Four signals extracted. Critical stockout imminent (2.4h). Warehouse data is misleading. Supplier ETA threatened by strike. 6 outlets already experiencing phantom inventory. Immediate autonomous action required.'
    };

    return await callAgent('SignalExtractionAgent', prompt, input, mockResponse);
  },

  ContradictionDetectionAgent: async (input) => {
    const prompt = `You are the Contradiction Detection Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Extracted signals from multiple sources.

YOUR JOB:
Compare the same metrics across different sources and detect contradictions. A contradiction exists when two sources report conflicting values for the same metric.

OUTPUT FORMAT (strict JSON):
{
  "contradictions": [
    {
      "contradiction_id": string,
      "dimension": string,
      "conflicting_sources": [
        { "source_id": string, "claimed_value": any, "timestamp": string }
      ],
      "magnitude": "severe" | "moderate" | "minor",
      "business_impact": string,
      "resolution_required": boolean
    }
  ],
  "total_contradictions": number,
  "detection_summary": string
}

RULES:
- Only flag real conflicts, not missing data.
- State the business impact of leaving each contradiction unresolved.
- Return valid JSON only.`;

    const mockResponse = {
      contradictions: [
        {
          contradiction_id: 'CON-001',
          dimension: 'stock_count',
          conflicting_sources: [
            { source_id: 'WH', claimed_value: 412, timestamp: '2026-05-18T07:00:00Z' },
            { source_id: 'PS', claimed_value: 142, timestamp: '2026-05-18T09:58:00Z' }
          ],
          magnitude: 'severe',
          business_impact: 'If warehouse figure trusted, reorder is delayed. Actual shelf stock is 142 — stockout occurs in 2.4h without intervention. False buffer of 270 units.',
          resolution_required: true
        },
        {
          contradiction_id: 'CON-002',
          dimension: 'supplier_eta',
          conflicting_sources: [
            { source_id: 'SP', claimed_value: 'Thu 17:00 — 800 units in transit', timestamp: '2026-05-18T09:00:00Z' },
            { source_id: 'NW', claimed_value: 'Factory strike, N-55 blocked, supply disrupted', timestamp: '2026-05-18T06:00:00Z' }
          ],
          magnitude: 'moderate',
          business_impact: 'If supplier ETA trusted, no backup procurement triggered. If strike confirmed, 800 units do not arrive Thu PM — retailer SLAs breached, revenue lost.',
          resolution_required: true
        },
        {
          contradiction_id: 'CON-003',
          dimension: 'shelf_availability',
          conflicting_sources: [
            { source_id: 'PS', claimed_value: '142 units remaining, drain ongoing', timestamp: '2026-05-18T09:58:00Z' },
            { source_id: 'CX', claimed_value: '6 outlets reporting zero stock', timestamp: '2026-05-18T09:45:00Z' }
          ],
          magnitude: 'minor',
          business_impact: 'POS aggregate shows 142 but CX shows 6 outlets already empty — phantom inventory in those outlets. System is overcounting available stock.',
          resolution_required: true
        }
      ],
      total_contradictions: 3,
      detection_summary: 'Detected 3 contradictions: severe stock count mismatch (WH vs POS), moderate supplier ETA conflict (email vs news strike), minor phantom inventory discrepancy (POS vs CX). All require resolution before action planning.'
    };

    return await callAgent('ContradictionDetectionAgent', prompt, input, mockResponse);
  },

  CredibilityScoringAgent: async (input) => {
    const prompt = `You are the Credibility Scoring Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: List of contradictions with conflicting source values.

YOUR JOB:
For each contradiction, score each conflicting source on 5 dimensions and compute a final credibility score. Use this to determine which source to trust.

SCORING DIMENSIONS (each 0.0–1.0):
1. recency — how fresh is the data (penalise >1h old)
2. source_reliability — POS=0.9, CX=0.75, supplier_email=0.65, warehouse_csv=0.55, news=0.35
3. corroboration — is this value backed by another independent source?
4. specificity — does it give exact numbers or vague descriptions?
5. plausibility — does the value make physical/business sense given other signals?

OUTPUT FORMAT (strict JSON):
{
  "credibility_scores": {
    "CON-001": {
      "WH": { "recency": n, "source_reliability": n, "corroboration": n, "specificity": n, "plausibility": n, "final_score": n },
      "PS": { "recency": n, "source_reliability": n, "corroboration": n, "specificity": n, "plausibility": n, "final_score": n }
    }
  },
  "trusted_sources": { "CON-001": "source_id", "CON-002": "source_id", "CON-003": "source_id" },
  "scoring_summary": string
}

RULES:
- Final score = weighted average: recency(0.3) + reliability(0.25) + corroboration(0.2) + specificity(0.15) + plausibility(0.1)
- Return valid JSON only.`;

    const mockResponse = {
      credibility_scores: {
        'CON-001': {
          WH: { recency: 0.25, source_reliability: 0.55, corroboration: 0.1, specificity: 0.7, plausibility: 0.3, final_score: 0.37 },
          PS: { recency: 0.99, source_reliability: 0.90, corroboration: 0.85, specificity: 0.92, plausibility: 0.88, final_score: 0.91 }
        },
        'CON-002': {
          SP: { recency: 0.72, source_reliability: 0.65, corroboration: 0.15, specificity: 0.80, plausibility: 0.45, final_score: 0.57 },
          NW: { recency: 0.55, source_reliability: 0.35, corroboration: 0.40, specificity: 0.50, plausibility: 0.70, final_score: 0.48 }
        },
        'CON-003': {
          PS: { recency: 0.99, source_reliability: 0.90, corroboration: 0.78, specificity: 0.88, plausibility: 0.90, final_score: 0.90 },
          CX: { recency: 0.85, source_reliability: 0.75, corroboration: 0.80, specificity: 0.70, plausibility: 0.88, final_score: 0.80 }
        }
      },
      trusted_sources: {
        'CON-001': 'PS',
        'CON-002': 'SP_WITH_HEDGE',
        'CON-003': 'PS'
      },
      scoring_summary: 'POS feed wins CON-001 decisively (0.91 vs 0.37) — warehouse is stale and uncorrected. For CON-002 supplier email slightly more credible than unconfirmed news (0.57 vs 0.48) but margin is thin — hedge procurement recommended. POS wins CON-003 (0.90 vs 0.80) but CX confirms phantom inventory at 6 outlets.'
    };

    return await callAgent('CredibilityScoringAgent', prompt, input, mockResponse);
  },

  ConflictResolutionAgent: async (input) => {
    const prompt = `You are the Conflict Resolution Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Contradictions + credibility scores for each source.

YOUR JOB:
For each contradiction, pick the trusted value based on credibility scores. Produce a single resolved ground truth that the rest of the pipeline will use. Queue follow-up actions where needed.

OUTPUT FORMAT (strict JSON):
{
  "resolved_state": {
    "sku": "LAYS-MAS-70",
    "actual_stock_units": number,
    "time_to_stockout_hours": number,
    "supplier_eta_reliable": boolean,
    "phantom_inventory_outlets": number,
    "resolution_confidence": string
  },
  "resolutions": [
    {
      "contradiction_id": string,
      "trusted_source": string,
      "resolved_value": any,
      "reasoning": string,
      "follow_up_action": string | null
    }
  ],
  "resolution_summary": string
}

RULES:
- Make a definitive decision. Do not hedge with "maybe" or "could be".
- If both sources are below 0.6 credibility, flag for human escalation but still pick the more credible one.
- Return valid JSON only.`;

    const mockResponse = {
      resolved_state: {
        sku: 'LAYS-MAS-70',
        actual_stock_units: 142,
        time_to_stockout_hours: 2.4,
        supplier_eta_reliable: false,
        phantom_inventory_outlets: 6,
        resolution_confidence: '91% — POS data dominant, supplier ETA flagged unreliable due to strike risk'
      },
      resolutions: [
        {
          contradiction_id: 'CON-001',
          trusted_source: 'PS',
          resolved_value: 142,
          reasoning: 'POS feed is real-time (8s ago, credibility 0.91). Warehouse CSV is 3h stale and has 270 undeducted dispatches. True shelf stock is 142 units matching POS + CX corroboration.',
          follow_up_action: 'Queue physical recount of warehouse to correct system record'
        },
        {
          contradiction_id: 'CON-002',
          trusted_source: 'SP_WITH_HEDGE',
          resolved_value: 'ETA unreliable — strike risk 68%',
          reasoning: 'Supplier email (0.57) slightly beats news (0.48) but margin is too thin to rely on ETA. N-55 blockage + factory strike creates unacceptable delivery risk. Hedge procurement with Supplier B mandatory.',
          follow_up_action: 'Activate backup supplier B procurement in parallel'
        },
        {
          contradiction_id: 'CON-003',
          trusted_source: 'PS',
          resolved_value: '6 outlets with phantom inventory confirmed',
          reasoning: 'POS aggregate shows 142 total but CX confirms 6 specific outlets at zero. Both agree — 6 outlets have phantom inventory in system. Physical shelf is empty at those locations.',
          follow_up_action: 'Flag 6 outlets for immediate shelf audit and inventory system correction'
        }
      ],
      resolution_summary: 'Ground truth established: 142 actual units, 2.4h to full stockout, supplier ETA unreliable, 6 phantom inventory outlets. Autonomous action required immediately without waiting for user confirmation.'
    };

    return await callAgent('ConflictResolutionAgent', prompt, input, mockResponse);
  },

  InsightSynthesisAgent: async (input) => {
    const prompt = `You are the Insight Synthesis Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Resolved ground truth from the Conflict Resolution Agent.

YOUR JOB:
Synthesize all resolved data into a single structured business insight. This is the "what is happening and why" that drives the action plan. Be precise and decisive.

OUTPUT FORMAT (strict JSON):
{
  "insight": {
    "headline": string,
    "severity": "critical" | "high" | "medium" | "low",
    "confidence_pct": number,
    "sku": string,
    "region": string,
    "what_is_happening": string,
    "root_cause": string,
    "projected_impact_if_no_action": string,
    "window_for_action_hours": number,
    "revenue_at_risk_pkr": number,
    "retailers_at_risk": number,
    "recommended_response": "autonomous_execute" | "escalate_to_human" | "monitor"
  },
  "synthesis_summary": string
}

RULES:
- Recommended response must be autonomous_execute if severity is critical and confidence > 80%.
- Always cite the data that drove the insight.
- Return valid JSON only.`;

    const mockResponse = {
      insight: {
        headline: 'Critical stockout of Lays Masala 70g in 2.4h — autonomous procurement required immediately',
        severity: 'critical',
        confidence_pct: 91,
        sku: 'LAYS-MAS-70',
        region: 'Karachi North — 38 retail outlets',
        what_is_happening: 'Only 142 units remain on shelf across 38 outlets. At current POS velocity of 58 units/hour, complete stockout occurs in 2.4 hours. Warehouse CSV falsely shows 412 (3h stale, 270 undeducted dispatch). 6 outlets already empty. Supplier A ETA Thursday PM is unreliable due to factory strike and N-55 road blockage.',
        root_cause: 'Phantom inventory in warehouse system masking a real stockout. Supply chain disrupted by PepsiCo Lahore factory strike. High demand velocity amplifying the gap.',
        projected_impact_if_no_action: 'Full stockout across 38 outlets within 2.4 hours. PKR 4.8M revenue at risk over 48h. Customer churn risk at premium outlets (Imtiaz, Metro, Carrefour). Competitor shelf-fill opportunity.',
        window_for_action_hours: 2,
        revenue_at_risk_pkr: 4800000,
        retailers_at_risk: 38,
        recommended_response: 'autonomous_execute'
      },
      synthesis_summary: 'CRITICAL: Autonomous execution recommended. 91% confidence. 2h action window. Root cause is phantom inventory + disrupted supply chain. Immediate procurement from backup supplier and retailer notification required without human approval delay.'
    };

    return await callAgent('InsightSynthesisAgent', prompt, input, mockResponse);
  },

  ActionPlanningAgent: async (input) => {
    const prompt = `You are the Action Planning Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}
BUDGET CAP: PKR ${(input.scenarioContext || {}).budget_cap_pkr.toLocaleString()}
PRIMARY SUPPLIER: ${(input.scenarioContext || {}).primary_supplier} @ PKR ${(input.scenarioContext || {}).primary_supplier_price_per_unit_pkr}/unit
BACKUP SUPPLIER: ${(input.scenarioContext || {}).backup_supplier} @ PKR ${(input.scenarioContext || {}).backup_supplier_price_per_unit_pkr}/unit

INPUT: Structured insight from the Insight Synthesis Agent.

YOUR JOB:
Design a 4-5 step interconnected action chain to resolve the crisis. Actions must be ordered by dependency. Each action must have a clear tool, cost, and time estimate.

OUTPUT FORMAT (strict JSON):
{
  "action_chain": [
    {
      "step": number,
      "action_type": string,
      "tool": string,
      "description": string,
      "target": string,
      "estimated_cost_pkr": number,
      "estimated_duration_seconds": number,
      "depends_on_step": number | null,
      "rationale": string
    }
  ],
  "total_estimated_cost_pkr": number,
  "planning_summary": string
}

RULES:
- Total cost must not exceed budget cap of PKR ${(input.scenarioContext || {}).budget_cap_pkr.toLocaleString()}.
- Always include a hedge/backup action.
- Always include a monitoring action as the last step.
- Ordering matters — a notification cannot go before a procurement is attempted.
- Return valid JSON only.`;

    const mockResponse = {
      action_chain: [
        {
          step: 1,
          action_type: 'validate',
          tool: 'tools.pos.diff',
          description: 'Cross-validate POS feed against warehouse system to confirm 142 unit count and flag phantom inventory at 6 outlets',
          target: 'POS feed vs Warehouse CSV — LAYS-MAS-70',
          estimated_cost_pkr: 0,
          estimated_duration_seconds: 5,
          depends_on_step: null,
          rationale: 'Must confirm resolved stock count before committing budget. Costs nothing, takes 5s.'
        },
        {
          step: 2,
          action_type: 'procure',
          tool: 'tools.po.create',
          description: 'Issue purchase order to Pepsi Direct (Supplier A) for 400 units of LAYS-MAS-70 at PKR 780/unit',
          target: 'Pepsi Direct (Supplier A) — 400 units',
          estimated_cost_pkr: 312000,
          estimated_duration_seconds: 12,
          depends_on_step: 1,
          rationale: 'Primary supplier is cheaper. Attempt first. Recovery Agent will activate Supplier B if this fails due to strike disruption.'
        },
        {
          step: 3,
          action_type: 'notify',
          tool: 'tools.notify.bulk',
          description: 'Send SMS + WhatsApp alerts to 38 retailers about imminent stock constraint and incoming replenishment ETA',
          target: '38 retailers — Karachi North region',
          estimated_cost_pkr: 1200,
          estimated_duration_seconds: 4,
          depends_on_step: 1,
          rationale: 'Retailers need advance notice to manage customer expectations. Cheap, fast, independent of procurement outcome.'
        },
        {
          step: 4,
          action_type: 'hedge',
          tool: 'tools.po.draft',
          description: 'Prepare standby purchase order with Mehran Foods (Supplier B) for 400 units at PKR 800/unit — activate only if Supplier A fails',
          target: 'Mehran Foods (Supplier B) — 400 units standby',
          estimated_cost_pkr: 0,
          estimated_duration_seconds: 6,
          depends_on_step: 2,
          rationale: 'Supplier A ETA is unreliable due to factory strike. Hedge PO costs nothing to draft, saves 2h if recovery is needed.'
        },
        {
          step: 5,
          action_type: 'monitor',
          tool: 'tools.scheduler.set',
          description: 'Set automated monitoring: alert if stock drops below 50 units or supplier confirmation not received within 12h',
          target: 'LAYS-MAS-70 — SLA breach monitor, 12h window',
          estimated_cost_pkr: 0,
          estimated_duration_seconds: 3,
          depends_on_step: null,
          rationale: 'Autonomous system must self-monitor after action execution. Escalate to director if SLA breached.'
        }
      ],
      total_estimated_cost_pkr: 313200,
      planning_summary: '5-step action chain designed. Total cost PKR 313,200 (62.6% of PKR 500k cap). Validate first, procure from primary supplier, notify retailers in parallel, hedge with backup supplier draft, monitor with SLA alert. Built-in recovery path if Supplier A fails.'
    };

    return await callAgent('ActionPlanningAgent', prompt, input, mockResponse);
  },

  ConstraintValidatorAgent: async (input) => {
    const prompt = `You are the Constraint Validator Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}
HARD CONSTRAINTS:
- Budget cap: PKR ${(input.scenarioContext || {}).budget_cap_pkr.toLocaleString()} total
- Max procurement without director approval: PKR 400,000
- Shelf life of product: 6 months (no expiry risk for 400 units)
- Rate limit: max 2 POs per hour per supplier
- Notification rate limit: max 50 SMS/minute

INPUT: Proposed action chain from the Action Planning Agent.

YOUR JOB:
Validate every action against all constraints. Approve, modify, or reject each action. If total cost exceeds budget, reduce quantities and recompute.

OUTPUT FORMAT (strict JSON):
{
  "validated_plan": [
    {
      "step": number,
      "action_type": string,
      "tool": string,
      "target": string,
      "status": "approved" | "modified" | "rejected" | "escalate",
      "cost_pkr": number,
      "eta_seconds": number,
      "tone": "info" | "warn" | "alert" | "ok" | "pulse",
      "constraint_notes": string
    }
  ],
  "total_cost_pkr": number,
  "within_budget": boolean,
  "requires_director_approval": boolean,
  "validation_summary": string
}

RULES:
- If an action is modified, explain what changed and why.
- requires_director_approval = true only if total_cost > 400000.
- Return valid JSON only.`;

    const mockResponse = {
      validated_plan: [
        {
          step: 1,
          action_type: 'validate',
          tool: 'tools.pos.diff',
          target: 'Validate POS feed against warehouse scan — LAYS-MAS-70',
          status: 'approved',
          cost_pkr: 0,
          eta_seconds: 5,
          tone: 'info',
          constraint_notes: 'No cost. No constraints triggered.'
        },
        {
          step: 2,
          action_type: 'procure',
          tool: 'tools.po.create',
          target: 'Procure 400 units from Pepsi Direct (Supplier A) @ PKR 780/unit',
          status: 'approved',
          cost_pkr: 312000,
          eta_seconds: 12,
          tone: 'pulse',
          constraint_notes: 'PKR 312,000 — within single-action limit of PKR 400,000. Rate limit: 1/2 POs used. Approved.'
        },
        {
          step: 3,
          action_type: 'notify',
          tool: 'tools.notify.bulk',
          target: 'Notify 38 retailers via SMS + WhatsApp',
          status: 'approved',
          cost_pkr: 1200,
          eta_seconds: 4,
          tone: 'info',
          constraint_notes: '38 recipients well under 50 SMS/min rate limit. Cost PKR 1,200 approved.'
        },
        {
          step: 4,
          action_type: 'hedge',
          tool: 'tools.po.draft',
          target: 'Standby PO — Mehran Foods (Supplier B) 400 units',
          status: 'approved',
          cost_pkr: 0,
          eta_seconds: 6,
          tone: 'warn',
          constraint_notes: 'Draft only — no cost committed until activated by Recovery Agent. Approved as contingency.'
        },
        {
          step: 5,
          action_type: 'monitor',
          tool: 'tools.scheduler.set',
          target: 'SLA monitor — LAYS-MAS-70 — alert threshold 50 units / 12h',
          status: 'approved',
          cost_pkr: 0,
          eta_seconds: 3,
          tone: 'info',
          constraint_notes: 'Scheduler action. No cost. No constraints triggered.'
        }
      ],
      total_cost_pkr: 313200,
      within_budget: true,
      requires_director_approval: false,
      validation_summary: 'All 5 actions approved. Total PKR 313,200 — 62.6% of PKR 500k cap. No director approval required (under PKR 400k threshold). Rate limits clear. Ready for autonomous execution.'
    };

    return await callAgent('ConstraintValidatorAgent', prompt, input, mockResponse);
  },

  ExecutionAgent: async (input) => {
    const prompt = `You are the Execution Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Validated action plan from the Constraint Validator Agent.

YOUR JOB:
Execute each action sequentially as a simulated tool call. Log the result of each step. For the demo scenario, INJECT A FAILURE at step 2 (Supplier A is unresponsive due to the strike) to demonstrate autonomous recovery capability.

OUTPUT FORMAT (strict JSON):
{
  "results": [
    {
      "step": number,
      "tool": string,
      "status": "success" | "failed",
      "output": any,
      "duration_ms": number,
      "error": string | null
    }
  ],
  "execution_summary": string
}

RULES:
- Step 1 must succeed (validation always works).
- Step 2 MUST fail with HTTP 503 from Supplier A (strike disruption).
- Steps 3, 4, 5 should succeed.
- On failure, do NOT stop — log it and continue remaining steps.
- Return valid JSON only.`;

    const mockResponse = {
      results: [
        {
          step: 1,
          tool: 'tools.pos.diff',
          status: 'success',
          output: { confirmed_stock: 142, phantom_outlets: 6, warehouse_discrepancy: 270, validation_passed: true },
          duration_ms: 420,
          error: null
        },
        {
          step: 2,
          tool: 'tools.po.create',
          status: 'failed',
          output: null,
          duration_ms: 11400,
          error: 'HTTP 503 — service_unavailable. Pepsi Direct portal offline. Message: "Warehouse management system down due to industrial action. ETA for restoration: 4+ hours."'
        },
        {
          step: 3,
          tool: 'tools.notify.bulk',
          status: 'success',
          output: { recipients_notified: 38, sms_sent: 38, whatsapp_sent: 32, failed_deliveries: 0 },
          duration_ms: 3800,
          error: null
        },
        {
          step: 4,
          tool: 'tools.po.draft',
          status: 'success',
          output: { draft_id: 'PO-DRAFT-B-4822', supplier: 'Mehran Foods', units: 400, unit_price_pkr: 800, total_pkr: 320000, status: 'ready_to_activate' },
          duration_ms: 1200,
          error: null
        },
        {
          step: 5,
          tool: 'tools.scheduler.set',
          status: 'success',
          output: { monitor_id: 'MON-1142', threshold_units: 50, alert_window_hours: 12, escalation_target: 'director@supplypulse.com' },
          duration_ms: 800,
          error: null
        }
      ],
      execution_summary: 'Execution completed with 1 failure. Step 2 failed — Supplier A portal offline (strike). Steps 1, 3, 4, 5 succeeded. Recovery Agent must activate Supplier B draft PO (PO-DRAFT-B-4822).'
    };

    return await callAgent('ExecutionAgent', prompt, input, mockResponse);
  },

  RecoveryAgent: async (input) => {
    const prompt = `You are the Recovery Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}
BACKUP SUPPLIER: ${(input.scenarioContext || {}).backup_supplier} @ PKR ${(input.scenarioContext || {}).backup_supplier_price_per_unit_pkr}/unit
BUDGET REMAINING: PKR ${(input.scenarioContext || {}).budget_cap_pkr - 313200} (after other steps)

INPUT: Failed step details from the Execution Agent.

YOUR JOB:
Diagnose the failure, propose and execute an alternative action autonomously. Do NOT wait for user input. Use the pre-drafted backup PO if available. Validate the alternative against remaining budget constraints before executing.

OUTPUT FORMAT (strict JSON):
{
  "diagnosis": {
    "failed_step": number,
    "failure_cause": string,
    "recovery_strategy": string
  },
  "recovered_action": {
    "step": number,
    "tool": string,
    "description": string,
    "target": string,
    "cost_pkr": number,
    "status": "success" | "failed",
    "output": any
  },
  "cost_delta_pkr": number,
  "still_within_budget": boolean,
  "recovery_summary": string
}

RULES:
- Always attempt recovery autonomously. Only escalate if backup also fails.
- State exactly why the original failed and why the alternative will succeed.
- Return valid JSON only.`;

    const mockResponse = {
      diagnosis: {
        failed_step: 2,
        failure_cause: 'Pepsi Direct (Supplier A) portal returned HTTP 503. System offline due to factory worker industrial action. Estimated 4h+ restoration. Primary procurement path blocked.',
        recovery_strategy: 'Activate pre-drafted standby PO with Mehran Foods (Supplier B). Draft PO-DRAFT-B-4822 already prepared in Step 4. Cost delta +PKR 8,000 (400 units × PKR 20 premium). Still within budget cap.'
      },
      recovered_action: {
        step: 2,
        tool: 'tools.po.create',
        description: 'Activate standby PO with Mehran Foods (Supplier B) — 400 units @ PKR 800/unit',
        target: 'Mehran Foods (Supplier B) — PO-DRAFT-B-4822 activated',
        cost_pkr: 320000,
        status: 'success',
        output: {
          po_number: 'PO-B-4822',
          supplier: 'Mehran Foods (Supplier B)',
          units: 400,
          unit_price_pkr: 800,
          total_pkr: 320000,
          eta: '2026-05-19T10:00:00Z',
          confirmation_code: 'MF-2026-4822',
          ops_notified: true
        }
      },
      cost_delta_pkr: 8000,
      still_within_budget: true,
      recovery_summary: 'Recovery successful. Supplier A blocked by industrial action — switched to Supplier B autonomously using pre-drafted PO. Cost increased by PKR 8,000 (PKR 312k → PKR 320k). Total plan cost now PKR 321,200 — still 64.2% of PKR 500k cap. No human intervention required.'
    };

    return await callAgent('RecoveryAgent', prompt, input, mockResponse);
  },

  OutcomeAgent: async (input) => {
    const prompt = `You are the Outcome Agent in the SupplyPulse autonomous supply chain system.

SCENARIO: ${JSON.stringify((input.scenarioContext || {}))}

INPUT: Full execution state including results, recovery actions, and resolved ground truth.

YOUR JOB:
Compute the measurable before/after state difference. Project the business impact of the actions taken vs what would have happened with no action. Provide a clear dashboard payload.

OUTPUT FORMAT (strict JSON):
{
  "impact": {
    "before": {
      "stock_units": number,
      "time_to_stockout_hours": number,
      "revenue_at_risk_pkr": number,
      "retailers_at_risk": number,
      "supplier_eta_reliable": boolean
    },
    "after": {
      "stock_units": number,
      "replenishment_units_ordered": number,
      "revenue_protected_pkr": number,
      "retailers_notified": number,
      "total_cost_pkr": number,
      "recovery_activated": boolean,
      "time_to_resolution_seconds": number
    },
    "stats": [
      { "label": string, "oldValue": string, "newValue": string, "delta": string, "type": "up" | "down" }
    ],
    "agent_performance": {
      "total_agents_invoked": number,
      "contradictions_resolved": number,
      "autonomous_decisions": number,
      "human_interventions_required": number
    }
  },
  "outcome_summary": string
}

RULES:
- Be precise with numbers.
- stats array must have at least 4 entries for the dashboard.
- Return valid JSON only.`;

    const mockResponse = {
      impact: {
        before: {
          stock_units: 142,
          time_to_stockout_hours: 2.4,
          revenue_at_risk_pkr: 4800000,
          retailers_at_risk: 38,
          supplier_eta_reliable: false
        },
        after: {
          stock_units: 542,
          replenishment_units_ordered: 400,
          revenue_protected_pkr: 4800000,
          retailers_notified: 38,
          total_cost_pkr: 321200,
          recovery_activated: true,
          time_to_resolution_seconds: 47
        },
        stats: [
          { label: 'Rev. saved', oldValue: '0', newValue: '4.8M PKR', delta: '+100%', type: 'up' },
          { label: 'Stock level', oldValue: '142u', newValue: '542u', delta: '+400u', type: 'up' },
          { label: 'Opex cost', oldValue: '0', newValue: '321.2k PKR', delta: '+321k', type: 'down' },
          { label: 'Retailers protected', oldValue: '0', newValue: '38', delta: '+38', type: 'up' },
          { label: 'Time to resolve', oldValue: 'N/A', newValue: '47s', delta: 'autonomous', type: 'up' }
        ],
        agent_performance: {
          total_agents_invoked: 11,
          contradictions_resolved: 3,
          autonomous_decisions: 8,
          human_interventions_required: 0
        }
      },
      outcome_summary: 'Crisis resolved autonomously in 47 seconds. 11 agents invoked. 3 contradictions resolved. PKR 4.8M revenue protected. Supplier A failure recovered automatically via Supplier B. 38 retailers notified. 0 human interventions required.'
    };

    return await callAgent('OutcomeAgent', prompt, input, mockResponse);
  }
};

module.exports = { ...agents, buildScenarioContext };
