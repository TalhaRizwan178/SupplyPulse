const mongoose = require('mongoose');

const traceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  agentName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
  scenarioId: { type: String, required: true }
});

const actionChainSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  scenarioId: { type: String, required: true },
  actions: [{
    step: Number,
    actionType: String,
    target: String,
    status: { type: String, default: 'pending' },
    details: mongoose.Schema.Types.Mixed,
    error: String
  }],
  status: { type: String, enum: ['draft', 'validated', 'executing', 'completed', 'failed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now }
});

const Trace = mongoose.model('Trace', traceSchema);
const ActionChain = mongoose.model('ActionChain', actionChainSchema);
const { Crisis, Source, Contradiction, Outcome, DashboardMetric, Supplier } = require('./DataModels');

module.exports = { Trace, ActionChain, Crisis, Source, Contradiction, Outcome, DashboardMetric, Supplier };
