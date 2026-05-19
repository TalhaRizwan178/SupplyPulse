const mongoose = require('mongoose');

const pendingTriggerSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sku:           { type: String, required: true },
  product_name:  { type: String },
  current_stock: { type: Number },
  threshold:     { type: Number },
  unit_cost_pkr: { type: Number },
  supplier:      { type: String },
  approved:      { type: Boolean, default: false },
  rejected:      { type: Boolean, default: false },
  scenarioId:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PendingTrigger', pendingTriggerSchema);
