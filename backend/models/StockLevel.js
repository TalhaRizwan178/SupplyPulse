const mongoose = require('mongoose');

const stockLevelSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:            { type: String, required: true },
  product_name:   { type: String, required: true },
  category:       { type: String, default: 'General' },
  current_stock:  { type: Number, default: 0 },
  initial_stock:  { type: Number, default: 0 },
  threshold:      { type: Number, default: 200 },   // auto-trigger below this
  sales_per_tick: { type: Number, default: 10 },    // units sold per simulation tick
  unit_cost_pkr:  { type: Number, default: 500 },
  supplier:       { type: String, default: '' },
  triggered:      { type: Boolean, default: false },// already fired agent for this dip
  triggered_at:   { type: Date },
  last_updated:   { type: Date, default: Date.now },
});

stockLevelSchema.index({ sku: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('StockLevel', stockLevelSchema);
