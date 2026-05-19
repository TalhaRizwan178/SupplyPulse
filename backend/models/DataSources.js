const mongoose = require('mongoose');

// ── Warehouse ─────────────────────────────────────────────────────────────────
const warehouseItemSchema = new mongoose.Schema({
  organizationId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:               { type: String, required: true },
  product_name:      String,
  category:          String,
  qty_on_hand:       { type: Number, default: 0 },
  pending_dispatch:  { type: Number, default: 0 },
  reorder_level:     { type: Number, default: 200 },
  last_recount_date: String,
  warehouse:         String,
  unit_cost_pkr:     { type: Number, default: 0 },
  supplier:          String,
  note:              String,
}, { timestamps: true });

warehouseItemSchema.index({ sku: 1, organizationId: 1 }, { unique: true });

// ── POS Feed ──────────────────────────────────────────────────────────────────
const posOutletSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  outlet_id:   String,
  name:        String,
  area:        String,
  region:      String,
  feed_timestamp: String,
  skus: [{
    sku:                String,
    shelf_units:        Number,
    sold_last_24h:      Number,
    sold_last_6h:       Number,
    velocity_per_hour:  Number,
    last_sale_at:       String,
  }],
});

const posSkuSummarySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:                              String,
  product_name:                     String,
  avg_velocity_per_hour:            Number,
  units_sold_last_24h:              Number,
  units_sold_last_6h:               Number,
  total_shelf_units_across_outlets: Number,
  projected_stockout_hours:         Number,
  outlets_at_zero_stock:            Number,
  revenue_last_24h_pkr:             Number,
});

// ── Supplier Emails ───────────────────────────────────────────────────────────
const supplierEmailThreadSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  thread_id:        String,
  subject:          String,
  sku:              String,
  supplier:         String,
  supplier_email:   String,
  latest_message_at: String,
  units_confirmed:  Number,
  promised_eta:     String,
  lr_number:        String,
  confidence:       String,
  risk_flags:       [String],
  affected_skus:    [String],
  impact:           String,
  messages: [{
    from:    String,
    to:      String,
    sent_at: String,
    body:    String,
  }],
});

// ── Complaints ────────────────────────────────────────────────────────────────
const complaintSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  complaint_id:     String,
  sku:              String,
  outlet:           String,
  channel:          String,
  received_at:      String,
  type:             String,
  sentiment:        String,
  message:          String,
  escalation_risk:  String,
});

const complaintSummarySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:                 { type: String, required: true },
  total_last_6h:       Number,
  total_last_24h:      Number,
  out_of_stock_reports: Number,
  low_stock_warnings:  Number,
  dominant_sentiment:  String,
  escalation_risk:     String,
});

complaintSummarySchema.index({ sku: 1, organizationId: 1 }, { unique: true });

// ── News ──────────────────────────────────────────────────────────────────────
const newsArticleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  article_id:        String,
  headline:          String,
  outlet:            String,
  published_at:      String,
  summary:           String,
  affected_brands:   [String],
  affected_company:  String,
  affected_facility: String,
  severity:          String,
  credibility:       Number,
  tags:              [String],
});

// ── Meta ──────────────────────────────────────────────────────────────────────
const feedMetaSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  source:    { type: String, required: true }, // 'pos', 'complaints', 'news', 'supplier_emails'
  meta:      mongoose.Schema.Types.Mixed,
}, { timestamps: true });

feedMetaSchema.index({ source: 1, organizationId: 1 }, { unique: true });

module.exports = {
  WarehouseItem:      mongoose.model('WarehouseItem',      warehouseItemSchema),
  PosOutlet:          mongoose.model('PosOutlet',          posOutletSchema),
  PosSkuSummary:      mongoose.model('PosSkuSummary',      posSkuSummarySchema),
  SupplierEmailThread: mongoose.model('SupplierEmailThread', supplierEmailThreadSchema),
  Complaint:          mongoose.model('Complaint',          complaintSchema),
  ComplaintSummary:   mongoose.model('ComplaintSummary',   complaintSummarySchema),
  NewsArticle:        mongoose.model('NewsArticle',        newsArticleSchema),
  FeedMeta:           mongoose.model('FeedMeta',           feedMetaSchema),
};
