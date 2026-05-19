const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  key:   { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

systemSettingSchema.index({ key: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
