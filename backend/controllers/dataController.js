const { Crisis, Source } = require('../models');

exports.seedMockData = async (orgId) => {
  const count = await Crisis.countDocuments({ organizationId: orgId });
  if (count === 0) {
    const crisis = new Crisis({
      organizationId: orgId,
      title: 'Lays Masala 70g',
      sku: 'LAYS-MAS-70',
      region: 'Karachi · North region',
      affectedRetailers: 38,
      daysOfCover: 1.4,
      stockoutRisk: 78,
      revenueExposed: 4.8,
      status: 'open'
    });
    await crisis.save();

    const sources = [
      { organizationId: orgId, crisisId: crisis._id, sourceId: 'WH', label: 'warehouse.csv', tone: 'info', snippet: 'qty_on_hand,412,LAYS-MAS-70', credibility: 0.62 },
      { organizationId: orgId, crisisId: crisis._id, sourceId: 'PS', label: 'pos.feed', tone: 'ok', snippet: 'last_24h_velocity=58/h · 142 left', credibility: 0.89 },
      { organizationId: orgId, crisisId: crisis._id, sourceId: 'SP', label: 'supplier.email', tone: 'warn', snippet: '"shipped 800u Tue, ETA Thu PM"', credibility: 0.71 },
      { organizationId: orgId, crisisId: crisis._id, sourceId: 'CX', label: 'complaints.feed', tone: 'warn', snippet: '"can\'t find masala at Imtiaz DHA"', credibility: 0.55 },
      { organizationId: orgId, crisisId: crisis._id, sourceId: 'NW', label: 'news.scrape', tone: 'alert', snippet: 'PepsiCo factory strike — Lahore', credibility: 0.42 }
    ];
    await Source.insertMany(sources);
    console.log(`Mock Crisis & Sources seeded for org: ${orgId}`);
  }
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
