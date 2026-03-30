const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, default: 'ES', trim: true },
  taxId: { type: String, trim: true }, // NIF/CIF
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalQuotes: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }
}, { timestamps: true });

ClientSchema.index({ name: 1 });
ClientSchema.index({ email: 1 });
ClientSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Client', ClientSchema);
