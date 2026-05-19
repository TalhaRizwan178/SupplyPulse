const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  businessEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  industry:      { type: String, default: '' },
  region:        { type: String, default: 'Pakistan' },
  planType:      { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  budgetCapPkr:  { type: Number, default: 500000 },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Organization', organizationSchema);
