const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { Complaint, ComplaintSummary } = require('../models/DataSources');

router.use(authMiddleware, tenantMiddleware);

// GET /api/complaints — list all complaints for org
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find({ organizationId: req.orgId })
      .sort({ received_at: -1 })
      .limit(50)
      .lean();
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints — log a new complaint
router.post('/', async (req, res) => {
  try {
    const { sku, outlet, channel, message, sentiment } = req.body;
    if (!sku || !message) return res.status(400).json({ error: 'sku and message are required' });

    const complaint = await Complaint.create({
      organizationId: req.orgId,
      complaint_id: `CX-${Date.now()}`,
      sku,
      outlet: outlet || 'Unknown Outlet',
      channel: channel || 'Phone',
      received_at: new Date().toISOString(),
      type: 'out_of_stock',
      sentiment: sentiment || 'negative',
      message,
      escalation_risk: 'medium',
    });

    // Upsert ComplaintSummary for this SKU
    const now = new Date();
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const [last6h, last24h] = await Promise.all([
      Complaint.countDocuments({ sku, organizationId: req.orgId, received_at: { $gte: sixHoursAgo } }),
      Complaint.countDocuments({ sku, organizationId: req.orgId, received_at: { $gte: twentyFourHoursAgo } }),
    ]);

    const escalation_risk = last6h >= 5 ? 'high' : last6h >= 2 ? 'medium' : 'low';

    await ComplaintSummary.findOneAndUpdate(
      { sku, organizationId: req.orgId },
      {
        organizationId: req.orgId,
        sku,
        total_last_6h: last6h,
        total_last_24h: last24h,
        out_of_stock_reports: last24h,
        low_stock_warnings: 0,
        dominant_sentiment: 'negative',
        escalation_risk,
      },
      { upsert: true }
    );

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
