const { Crisis, Source, Contradiction } = require('../models');
const fs = require('fs');
const path = require('path');

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../data', filename), 'utf8'));
}
function parseCSV(filename) {
  const raw = fs.readFileSync(path.join(__dirname, '../data', filename), 'utf8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() ?? ''; });
    return obj;
  });
}

exports.seedCrisisData = async (orgId) => {
  // Always re-seed from data files to keep feed fresh for this org
  await Crisis.deleteMany({ organizationId: orgId });
  await Source.deleteMany({ organizationId: orgId });
  await Contradiction.deleteMany({ organizationId: orgId });

  const posFeed    = loadJSON('pos_feed.json');
  const warehouse  = parseCSV('warehouse.csv');
  const complaints = loadJSON('complaints.json');
  const news       = loadJSON('news.json');

  const crisisDefinitions = [
    {
      meta: { title: 'Lays Masala 70g', sku: 'LAYS-MAS-70', region: 'Karachi · North region', affectedRetailers: 38, daysOfCover: 0.1, stockoutRisk: 94, revenueExposed: 4.8, status: 'open' },
      sources: [
        { sourceId: 'WH', label: 'warehouse.csv', tone: 'alert', snippet: 'qty_on_hand: 412 · pending_dispatch: 270 (stale, 3h)', credibility: 0.37 },
        { sourceId: 'PS', label: 'pos.feed',       tone: 'alert', snippet: '142 units left · 58/h velocity · 2.4h to zero · 6 outlets at 0', credibility: 0.91 },
        { sourceId: 'SP', label: 'supplier.email', tone: 'warn',  snippet: '800u shipped Tue · ETA Thu 17:00 · N-55 risk flagged', credibility: 0.55 },
        { sourceId: 'CX', label: 'complaints.feed',tone: 'alert', snippet: `${complaints.sku_complaint_summary[0]?.total_last_6h || 23} complaints in 6h · sentiment: frustrated · escalation: critical`, credibility: 0.78 },
        { sourceId: 'NW', label: 'news.scrape',    tone: 'alert', snippet: news.articles[0]?.headline || 'PepsiCo strike — Lahore', credibility: 0.38 }
      ],
      contradictions: [
        { dimension: 'stock count', sources: ['warehouse.csv', 'pos.feed'], snippet: 'WH claims 412 on-hand. POS shows only 142 units left across all outlets (270 dispatched, not deducted).', impact: 'False inventory buffer. Reorder trigger delayed by ~3 hours. Phantom stock at 6 outlets.', severity: 'alert' },
        { dimension: 'supplier ETA', sources: ['supplier.email', 'news.scrape'], snippet: 'Supplier confirms 800u shipped, ETA Thu PM. News reports N-55 blockage + Lahore factory strike.', impact: 'ETA unreliable. 800u may not arrive before stockout. Backup supplier activation needed.', severity: 'warn' },
        { dimension: 'shelf availability', sources: ['pos.feed', 'complaints.feed'], snippet: 'POS: 142 units across 38 outlets. CX: 6 major outlets already show zero. Imtiaz DHA, Carrefour reporting empty shelves.', impact: 'Phantom inventory — system shows stock but shelves are empty. Consumer-visible stockout already happening.', severity: 'alert' }
      ]
    },
    {
      meta: { title: 'Lays French Cheese 70g', sku: 'LAYS-FRENCH-70', region: 'Karachi · North region', affectedRetailers: 12, daysOfCover: 0.8, stockoutRisk: 61, revenueExposed: 1.1, status: 'open' },
      sources: [
        { sourceId: 'WH', label: 'warehouse.csv', tone: 'warn',  snippet: 'qty_on_hand: 155 · below reorder (200) · stale 13h', credibility: 0.48 },
        { sourceId: 'PS', label: 'pos.feed',       tone: 'warn',  snippet: 'low shelf stock reported · velocity declining', credibility: 0.82 },
        { sourceId: 'SP', label: 'supplier.email', tone: 'alert', snippet: 'Lahore factory halted — LAYS-FRENCH-70 in affected list', credibility: 0.71 },
        { sourceId: 'NW', label: 'news.scrape',    tone: 'warn',  snippet: 'PepsiCo Lahore strike affects French Cheese line', credibility: 0.38 }
      ],
      contradictions: [
        { dimension: 'reorder status', sources: ['warehouse.csv', 'supplier.email'], snippet: 'WH shows 155 units (below reorder 200). Supplier cannot dispatch due to Lahore strike.', impact: 'Reorder impossible via primary supplier. Secondary supplier does not carry this SKU.', severity: 'warn' }
      ]
    },
    {
      meta: { title: 'Sting Energy 250ml', sku: 'STING-250', region: 'Karachi · North region', affectedRetailers: 8, daysOfCover: 2.1, stockoutRisk: 38, revenueExposed: 0.6, status: 'open' },
      sources: [
        { sourceId: 'WH', label: 'warehouse.csv', tone: 'warn',  snippet: 'qty_on_hand: 600 · near reorder (300) · note: monitor', credibility: 0.71 },
        { sourceId: 'PS', label: 'pos.feed',       tone: 'info',  snippet: 'velocity 2.0/h · stable · no zero-stock outlets', credibility: 0.88 },
        { sourceId: 'SP', label: 'supplier.email', tone: 'info',  snippet: 'Next weekly order due Fri — no disruption reported', credibility: 0.82 }
      ],
      contradictions: [
        { dimension: 'reorder timing', sources: ['warehouse.csv', 'pos.feed'], snippet: 'WH: 600 units (2× reorder level). POS velocity suggests depletion in ~4 days. Reorder lead time is 3 days.', impact: 'Tight window. If order not placed today, risk of gap next week.', severity: 'warn' }
      ]
    },
    {
      meta: { title: 'Olper Milk 1L', sku: 'OLPER-MILK-1L', region: 'Karachi · North region', affectedRetailers: 14, daysOfCover: 1.2, stockoutRisk: 44, revenueExposed: 0.9, status: 'open' },
      sources: [
        { sourceId: 'WH', label: 'warehouse.csv', tone: 'warn',  snippet: 'qty_on_hand: 980 · refill due Wed · cold chain stock', credibility: 0.74 },
        { sourceId: 'PS', label: 'pos.feed',       tone: 'warn',  snippet: 'velocity 2.3/h · 40 units at D-Mart Korangi only', credibility: 0.86 },
        { sourceId: 'SP', label: 'supplier.email', tone: 'ok',    snippet: 'Engro Foods confirmed Wed delivery — no disruption', credibility: 0.90 }
      ],
      contradictions: [
        { dimension: 'outlet coverage', sources: ['warehouse.csv', 'pos.feed'], snippet: 'WH shows 980 units in cold store. POS only reports 40 units at 1 outlet. Distribution gap across 13 other outlets.', impact: 'Stock exists in warehouse but not reaching shelves. Distribution routing issue.', severity: 'warn' }
      ]
    }
  ];

  for (const [idx, def] of crisisDefinitions.entries()) {
    // Stagger creation times so feed shows realistic relative timestamps
    const minsAgo = [3, 18, 47, 95][idx] || idx * 20;
    const crisis = new Crisis({
      organizationId: orgId,
      ...def.meta,
      createdAt: new Date(Date.now() - minsAgo * 60 * 1000)
    });
    await crisis.save();
    await Source.insertMany(def.sources.map(s => ({ ...s, organizationId: orgId, crisisId: crisis._id })));
    await Contradiction.insertMany(def.contradictions.map(c => ({ ...c, organizationId: orgId, crisisId: crisis._id })));
  }

  console.log(`Seeded ${crisisDefinitions.length} crises from data files for org: ${orgId}.`);
};

exports.getFeed = async (req, res) => {
  try {
    const crises = await Crisis.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 });
    res.json(crises);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCrisisDetail = async (req, res) => {
  try {
    const crisis = await Crisis.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!crisis) return res.status(404).json({ error: 'Not found' });
    
    const sources = await Source.find({ crisisId: crisis._id, organizationId: req.user.organizationId });
    res.json({ crisis, sources });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getContradictions = async (req, res) => {
  try {
    const contradictions = await Contradiction.find({ crisisId: req.params.id, organizationId: req.user.organizationId });
    res.json(contradictions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
