const { DashboardMetric, Trace } = require('../models');

exports.seedDashboardData = async (orgId) => {
  const count = await DashboardMetric.countDocuments({ organizationId: orgId });
  if (count === 0) {
    const metrics = [
      { organizationId: orgId, type: 'escalation', data: { id: 'esc-1142', sku: 'Lays Masala 70g', region: 'Karachi · North', severity: 'alert', headline: 'Agent failed to resolve contradiction. Action halted.', time: '12m' } },
      { organizationId: orgId, type: 'budget', data: { name: 'North Region', spent: 1200000, total: 5000000, pct: 24 } },
      { organizationId: orgId, type: 'budget', data: { name: 'Central Region', spent: 4800000, total: 5000000, pct: 96 } },
      { organizationId: orgId, type: 'team', data: { name: 'Ali Khan', role: 'Analyst', status: 'online' } },
      { organizationId: orgId, type: 'team', data: { name: 'Sara Ahmed', role: 'Analyst', status: 'offline' } },
      { organizationId: orgId, type: 'setting_source', data: { id: 'WH', name: 'Warehouse API', sync: '1h', status: 'ok', cred: 0.6 } },
      { organizationId: orgId, type: 'setting_source', data: { id: 'PS', name: 'POS Realtime Feed', sync: '1m', status: 'ok', cred: 0.95 } },
      { organizationId: orgId, type: 'setting_source', data: { id: 'SP', name: 'Supplier EDI', sync: '12h', status: 'warn', cred: 0.7 } }
    ];
    await DashboardMetric.insertMany(metrics);
    console.log(`Mock Dashboard Metrics seeded for org: ${orgId}`);
  }
};

exports.getDirectorDashboard = async (req, res) => {
  try {
    const escalations = await DashboardMetric.find({ type: 'escalation', organizationId: req.user.organizationId });
    const budgets = await DashboardMetric.find({ type: 'budget', organizationId: req.user.organizationId });
    const team = await DashboardMetric.find({ type: 'team', organizationId: req.user.organizationId });
    
    res.json({ escalations, budgets, team });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const sources = await DashboardMetric.find({ type: 'setting_source', organizationId: req.user.organizationId });
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTraces = async (req, res) => {
  try {
    const traces = await Trace.find({ organizationId: req.user.organizationId }).sort({ timestamp: -1 }).limit(50);
    res.json(traces);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
