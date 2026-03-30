const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  domain: { type: String },
  plan: { type: String, enum: ['free', 'professional', 'business', 'enterprise'], default: 'free' },
  isActive: { type: Boolean, default: true },
  settings: {
    maxUsers: { type: Number, default: 5 },
    maxQuotesPerMonth: { type: Number, default: 50 },
    features: {
      chat: { type: Boolean, default: true },
      freightExchange: { type: Boolean, default: false },
      clientPortal: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true }
    }
  },
  billing: {
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  contactEmail: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
