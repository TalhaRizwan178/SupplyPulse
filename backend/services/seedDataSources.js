/**
 * seedDataSources.js
 * ------------------
 * Seeds all data source collections from JSON/CSV files ONCE on startup.
 * After seeding, all data lives in MongoDB — no more file reads at runtime.
 */

const fs   = require('fs');
const path = require('path');

const {
  WarehouseItem, PosOutlet, PosSkuSummary,
  SupplierEmailThread, Complaint, ComplaintSummary,
  NewsArticle, FeedMeta,
} = require('../models/DataSources');

const DATA_DIR = path.join(__dirname, '../data');

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
}

function parseCSV(filename) {
  const raw     = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
  const lines   = raw.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() ?? ''; });
    return obj;
  });
}

async function seedDataSources(orgId) {
  if (!orgId) return;

  // Sync WarehouseItems FROM StockLevel — StockLevel is the source of truth.
  // Deletes any stale entries (e.g. from old warehouse.csv seeding) and
  // ensures every StockLevel SKU has a matching WarehouseItem for this org.
  const StockLevel = require('../models/StockLevel');
  const stockItems = await StockLevel.find({ organizationId: orgId });
  if (stockItems.length > 0) {
    const stockSkus = stockItems.map(s => s.sku);
    const deleted   = await WarehouseItem.deleteMany({ sku: { $nin: stockSkus }, organizationId: orgId });
    if (deleted.deletedCount > 0) {
      console.log(`[Seed] WarehouseItem — removed ${deleted.deletedCount} stale SKUs for org ${orgId}`);
    }
    for (const item of stockItems) {
      await WarehouseItem.findOneAndUpdate(
        { sku: item.sku, organizationId: orgId },
        {
          organizationId:    orgId,
          sku:               item.sku,
          product_name:      item.product_name,
          category:          item.category || 'General',
          qty_on_hand:       item.current_stock,
          pending_dispatch:  0,
          reorder_level:     item.threshold,
          last_recount_date: new Date().toISOString(),
          warehouse:         'Central Warehouse Karachi',
          unit_cost_pkr:     item.unit_cost_pkr,
          supplier:          item.supplier,
          note:              'Auto-synced',
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] WarehouseItem synced — ${stockItems.length} SKUs from StockLevel for org ${orgId}`);
  }

  // Seed POS
  const posCount = await PosOutlet.countDocuments({ organizationId: orgId });
  if (posCount === 0) {
    const pos = loadJSON('pos_feed.json');
    await PosOutlet.insertMany(pos.outlets.map(o => ({
      ...o,
      organizationId: orgId,
      region:         pos.region,
      feed_timestamp: pos.feed_timestamp,
    })));
    if (pos.sku_summary) {
      await PosSkuSummary.insertMany(pos.sku_summary.map(s => ({ ...s, organizationId: orgId })));
    }
    await FeedMeta.findOneAndUpdate(
      { source: 'pos', organizationId: orgId },
      { organizationId: orgId, meta: { feed_timestamp: pos.feed_timestamp, total_reporting_outlets: pos.total_reporting_outlets, region: pos.region } },
      { upsert: true }
    );
    console.log(`[Seed] PosOutlet — ${pos.outlets.length} outlets seeded for org ${orgId}`);
  }

  // Seed Supplier Emails
  const seCount = await SupplierEmailThread.countDocuments({ organizationId: orgId });
  if (seCount === 0) {
    const emails = loadJSON('supplier_emails.json');
    await SupplierEmailThread.insertMany(emails.threads.map(t => ({ ...t, organizationId: orgId })));
    await FeedMeta.findOneAndUpdate(
      { source: 'supplier_emails', organizationId: orgId },
      { organizationId: orgId, meta: { inbox_synced_at: emails.inbox_synced_at, monitored_inboxes: emails.monitored_inboxes } },
      { upsert: true }
    );
    console.log(`[Seed] SupplierEmailThread — ${emails.threads.length} threads seeded for org ${orgId}`);
  }

  // Seed Complaints
  const cxCount = await Complaint.countDocuments({ organizationId: orgId });
  if (cxCount === 0) {
    const cx = loadJSON('complaints.json');
    await Complaint.insertMany(cx.complaints.map(c => ({ ...c, complaint_id: c.id, organizationId: orgId })));
    if (cx.sku_complaint_summary) {
      for (const s of cx.sku_complaint_summary) {
        await ComplaintSummary.findOneAndUpdate(
          { sku: s.sku, organizationId: orgId },
          { ...s, organizationId: orgId },
          { upsert: true }
        );
      }
    }
    await FeedMeta.findOneAndUpdate(
      { source: 'complaints', organizationId: orgId },
      { organizationId: orgId, meta: { feed_synced_at: cx.feed_synced_at, source: cx.source, total_complaints_last_6h: cx.total_complaints_last_6h, total_complaints_last_24h: cx.total_complaints_last_24h } },
      { upsert: true }
    );
    console.log(`[Seed] Complaint — ${cx.complaints.length} complaints seeded for org ${orgId}`);
  }

  // Seed News
  const nwCount = await NewsArticle.countDocuments({ organizationId: orgId });
  if (nwCount === 0) {
    const news = loadJSON('news.json');
    await NewsArticle.insertMany(news.articles.map(a => ({ ...a, organizationId: orgId })));
    await FeedMeta.findOneAndUpdate(
      { source: 'news', organizationId: orgId },
      { organizationId: orgId, meta: { scrape_timestamp: news.scrape_timestamp, sources: news.sources, risk_summary: news.risk_summary } },
      { upsert: true }
    );
    console.log(`[Seed] NewsArticle — ${news.articles.length} articles seeded for org ${orgId}`);
  }
}

module.exports = { seedDataSources };
