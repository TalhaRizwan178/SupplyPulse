const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  crisisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crisis' },
  sourceId: String,
  label: String,
  tone: String,
  timestamp: Date,
  snippet: String,
  credibility: Number
});

const crisisSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: String,
  sku: String,
  region: String,
  affectedRetailers: Number,
  daysOfCover: Number,
  stockoutRisk: Number,
  revenueExposed: Number,
  status: { type: String, enum: ['open', 'resolved', 'failed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const contradictionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  crisisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crisis' },
  dimension: String,
  sources: [String],
  snippet: String,
  impact: String,
  severity: String
});

const outcomeSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  crisisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crisis' },
  stats: { type: mongoose.Schema.Types.Mixed, default: [] },
  message: String
});

const dashboardMetricSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  type: String, // 'escalation', 'budget', 'team', 'recent_trace', 'setting_source'
  data: mongoose.Schema.Types.Mixed
});

// ── Supplier model ────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true },
  phone:      { type: String, default: '' },
  products:   [{ type: String }], // SKU codes this supplier carries
  uploadedAt: { type: Date, default: Date.now },
});

// Compound unique: same supplier email can exist in different organizations
supplierSchema.index({ email: 1, organizationId: 1 }, { unique: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
const Crisis = mongoose.model('Crisis', crisisSchema);
const Source = mongoose.model('Source', sourceSchema);
const Contradiction = mongoose.model('Contradiction', contradictionSchema);
const Outcome = mongoose.model('Outcome', outcomeSchema);
const DashboardMetric = mongoose.model('DashboardMetric', dashboardMetricSchema);

module.exports = { Crisis, Source, Contradiction, Outcome, DashboardMetric, Supplier };
