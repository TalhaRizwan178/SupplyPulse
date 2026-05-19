const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  fullName:       { type: String, default: '' },
  email:          { type: String, required: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['admin', 'ops', 'analyst', 'director'], default: 'admin' },
  isActive:       { type: Boolean, default: true },
  createdAt:      { type: Date, default: Date.now },
});

// Compound unique: same email can exist across different orgs
userSchema.index({ email: 1, organizationId: 1 }, { unique: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
