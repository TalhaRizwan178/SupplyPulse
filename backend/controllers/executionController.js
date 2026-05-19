const { ActionChain, Outcome, Crisis } = require('../models');

exports.seedExecutionData = async (orgId) => {
  const count = await ActionChain.countDocuments({ organizationId: orgId });
  if (count === 0) {
    const crisis = await Crisis.findOne({ organizationId: orgId });
    if (!crisis) return;

    const actionChain = new ActionChain({
      organizationId: orgId,
      scenarioId: 'CRISIS-1142',
      crisisId: crisis._id,
      actions: [
        { step: 1, actionType: 'tools.pos.diff', target: 'Validate POS feed against on-shelf scan', status: 'pending', details: { cost: 0, eta: '5s', tone: 'info' } },
        { step: 2, actionType: 'tools.po.create', target: 'Procure 400u from Supplier A (Pepsi Direct)', status: 'pending', details: { cost: 312000, eta: '12s', tone: 'pulse' } },
        { step: 3, actionType: 'tools.notify.bulk', target: 'Notify 4 retailers · SMS + WhatsApp', status: 'pending', details: { cost: 1200, eta: '4s', tone: 'info' } },
        { step: 4, actionType: 'tools.po.draft', target: 'Hedge: standby PO with Supplier B (Mehran)', status: 'pending', details: { cost: 0, eta: '6s', tone: 'warn' } },
        { step: 5, actionType: 'tools.scheduler.set', target: 'Monitor + escalate on SLA breach (12h)', status: 'pending', details: { cost: 0, eta: '—', tone: 'info' } }
      ],
      status: 'validated'
    });
    await actionChain.save();

    const outcome = new Outcome({
      organizationId: orgId,
      crisisId: crisis._id,
      message: 'Workflow completed successfully with recovery.',
      stats: [
        { label: 'Rev. saved', oldValue: '0', newValue: '4.8M', delta: '+100%', type: 'up' },
        { label: 'Stock level', oldValue: '0', newValue: '1000', delta: '+1000', type: 'up' },
        { label: 'Opex cost', oldValue: '0', newValue: '313.2k', delta: '+313k', type: 'down' }
      ]
    });
    await outcome.save();
    console.log(`Mock Execution & Outcome seeded for org: ${orgId}`);
  }
};

exports.getActionPlan = async (req, res) => {
  try {
    // Return all plans for this org, most recent first (limit 10)
    const plans = await ActionChain.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 }).limit(10);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOutcomes = async (req, res) => {
  try {
    const outcome = await Outcome.findOne({ organizationId: req.user.organizationId }).sort({ _id: -1 });
    res.json(outcome);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
