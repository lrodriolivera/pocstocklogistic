/**
 * Quote Model for MongoDB
 * Stores complete quotation data with comprehensive schema
 */

const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
  // Quote identification
  quoteId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Route information
  route: {
    origin: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    distance: {
      type: Number,
      required: true
    },
    estimatedTransitDays: Number,
    countries: [String],
    geometry: mongoose.Schema.Types.Mixed // Polyline data for maps
  },

  // Cargo details
  cargo: {
    type: {
      type: String,
      enum: ['general', 'forestales', 'adr', 'refrigerado', 'especial'],
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 0.1
    },
    volume: Number,
    value: Number,
    description: String,
    // Advanced Load Calculator data
    linearMeters: Number,
    transportType: {
      type: String,
      enum: ['LTL', 'FTL', null],
      default: null
    },
    utilization: mongoose.Schema.Types.Mixed,
    loadDetails: [mongoose.Schema.Types.Mixed],
    calculatedFromPallets: Boolean,
    calculatedPricing: mongoose.Schema.Types.Mixed
  },

  // Cost breakdown
  costBreakdown: {
    distanceRate: Number,
    fuelCost: Number,
    tollCost: Number,
    tollBreakdown: [mongoose.Schema.Types.Mixed],
    tollVignettes: [mongoose.Schema.Types.Mixed],
    tollSpecial: [mongoose.Schema.Types.Mixed],
    driverCost: Number,
    vehicleCost: Number,
    subtotal: Number,
    adjustmentFactor: Number,
    margin: Number,
    totalWithoutVAT: Number,
    vat: Number,
    total: Number,
    ltlFtlDetails: mongoose.Schema.Types.Mixed
  },

  // Service alternatives
  alternatives: [mongoose.Schema.Types.Mixed],

  // Delivery schedule
  schedule: {
    pickup: {
      date: Date,
      weekday: String,
      formatted: String
    },
    delivery: {
      estimated: Date,
      earliest: Date,
      latest: Date,
      weekday: String,
      formatted: String,
      window: String
    },
    transitDays: Number,
    businessDays: Number,
    confidence: Number,
    analysis: mongoose.Schema.Types.Mixed
  },

  // AI Intelligence data
  intelligence: {
    sourcesConsulted: Number,
    recommendedTransportist: String,
    usedAI: Boolean,
    processingTime: Number,
    luc1Reasoning: String,
    luc1RestrictionsImpact: String,
    luc1RestrictionsRecommendations: [String],
    ltlFtlUsed: String,
    commercialMargin: Number,
    marginSource: String,
    routeSource: String,
    routeConfidence: Number,
    tollSource: String,
    tollConfidence: Number,
    restrictionsSource: String,
    countries: Number
  },

  // Alerts and restrictions
  alerts: [mongoose.Schema.Types.Mixed],
  restrictionsAnalysis: {
    totalAlerts: Number,
    summary: mongoose.Schema.Types.Mixed,
    criticalRestrictions: [mongoose.Schema.Types.Mixed],
    affectedCountries: [String],
    source: String
  },

  // Client information
  client: {
    company: String,
    email: String,
    contactName: String,
    phone: String
  },

  // Service preferences
  preferences: {
    serviceType: {
      type: String,
      enum: ['economico', 'estandar', 'express'],
      default: 'estandar'
    },
    profitMargin: {
      type: Number,
      min: 0,
      max: 100,
      default: 15
    }
  },

  // Additional requirements
  requirements: {
    insurance: Boolean,
    tracking: Boolean,
    signature: Boolean
  },

  // Quote validity and status
  validUntil: Date,
  confidence: Number,
  status: {
    type: String,
    enum: ['draft', 'active', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'negotiating'],
    default: 'active'
  },

  // Tracking System - NEW
  tracking: {
    timeline: [{
      status: {
        type: String,
        enum: ['generated', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'negotiating'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: String,
      performedBy: String, // user ID or 'system'
      metadata: mongoose.Schema.Types.Mixed // Additional context data
    }],

    // Client Portal Access
    clientAccess: {
      token: {
        type: String,
        unique: true,
        sparse: true // Only create index for non-null values
      },
      accessUrl: String,
      viewCount: {
        type: Number,
        default: 0
      },
      lastViewed: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    },

    // Email and Communication
    communications: [{
      type: {
        type: String,
        enum: ['email_template_generated', 'email_sent', 'follow_up', 'negotiation', 'client_accepted', 'client_rejected', 'client_negotiation'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      content: String,
      recipient: String,
      performedBy: String
    }],

    // Commercial Assignment
    assignedTo: {
      type: String, // User ID of the commercial who created the quote
      required: true
    },

    // Negotiation History
    negotiations: [{
      proposedPrice: Number,
      proposedChanges: mongoose.Schema.Types.Mixed,
      proposedBy: String, // 'client' or 'commercial'
      timestamp: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
      },
      notes: String
    }]
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  version: {
    type: Number,
    default: 1
  },

  // Search indexes
  searchTags: [String] // For better search functionality
}, {
  timestamps: true,
  versionKey: 'version'
});

// Indexes for performance
QuoteSchema.index({ 'route.origin': 1, 'route.destination': 1 });
QuoteSchema.index({ 'client.company': 1 });
QuoteSchema.index({ 'client.email': 1 });
QuoteSchema.index({ status: 1, createdAt: -1 });
QuoteSchema.index({ validUntil: 1 });
QuoteSchema.index({ 'cargo.type': 1 });
QuoteSchema.index({ 'preferences.serviceType': 1 });
// Tracking system indexes
QuoteSchema.index({ 'tracking.assignedTo': 1, createdAt: -1 });
QuoteSchema.index({ 'tracking.clientAccess.token': 1 });
QuoteSchema.index({ 'tracking.timeline.status': 1 });
QuoteSchema.index({ 'tracking.clientAccess.isActive': 1 });

// Pre-save middleware
QuoteSchema.pre('save', function(next) {
  // Update updatedAt on every save
  this.updatedAt = new Date();

  // Generate search tags for better searching
  this.searchTags = [
    this.route.origin,
    this.route.destination,
    this.cargo.type,
    this.preferences.serviceType,
    ...(this.route.countries || []),
    this.client.company,
    this.quoteId
  ].filter(Boolean).map(tag => tag.toString().toLowerCase());

  next();
});

// Instance methods
QuoteSchema.methods.isValid = function() {
  return this.validUntil > new Date();
};

QuoteSchema.methods.isExpired = function() {
  return this.validUntil <= new Date();
};

QuoteSchema.methods.markAsAccepted = function() {
  this.status = 'accepted';
  return this.save();
};

QuoteSchema.methods.markAsRejected = function() {
  this.status = 'rejected';
  return this.save();
};

// Tracking System Methods
QuoteSchema.methods.addTimelineEvent = function(status, description, performedBy, metadata = {}) {
  if (!this.tracking) {
    this.tracking = { timeline: [], clientAccess: {}, communications: [], negotiations: [] };
  }

  this.tracking.timeline.push({
    status,
    timestamp: new Date(),
    description,
    performedBy,
    metadata
  });

  // Update main status - map timeline status to quote status
  // 'generated' in timeline maps to 'active' in main status
  const statusMapping = {
    'generated': 'active',
    'sent': 'sent',
    'viewed': 'viewed',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'expired': 'expired',
    'negotiating': 'negotiating'
  };

  if (statusMapping[status]) {
    this.status = statusMapping[status];
  }

  return this.save();
};

QuoteSchema.methods.generateClientAccessToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  if (!this.tracking) {
    this.tracking = { timeline: [], clientAccess: {}, communications: [], negotiations: [] };
  }

  this.tracking.clientAccess = {
    token,
    accessUrl: `/portal/quote/${token}`,
    viewCount: 0,
    isActive: true
  };

  return this.save();
};

QuoteSchema.methods.recordClientView = function() {
  if (!this.tracking?.clientAccess) return this;

  this.tracking.clientAccess.viewCount += 1;
  this.tracking.clientAccess.lastViewed = new Date();

  // Add timeline event if it's the first view
  if (this.tracking.clientAccess.viewCount === 1) {
    this.addTimelineEvent('viewed', 'Cliente visualizó la cotización por primera vez', 'client');
  }

  return this.save();
};

QuoteSchema.methods.addCommunication = function(type, content, recipient, performedBy) {
  if (!this.tracking) {
    this.tracking = { timeline: [], clientAccess: {}, communications: [], negotiations: [] };
  }

  this.tracking.communications.push({
    type,
    timestamp: new Date(),
    content,
    recipient,
    performedBy
  });

  return this.save();
};

QuoteSchema.methods.addNegotiation = async function(proposedPrice, proposedChanges, proposedBy, notes) {
  try {
    if (!this.tracking) {
      this.tracking = { timeline: [], clientAccess: {}, communications: [], negotiations: [] };
    }

    if (!this.tracking.negotiations) {
      this.tracking.negotiations = [];
    }

    this.tracking.negotiations.push({
      proposedPrice,
      proposedChanges,
      proposedBy,
      timestamp: new Date(),
      status: 'pending',
      notes
    });

    // Update status to negotiating
    this.status = 'negotiating';

    // Add timeline event without saving yet
    if (!this.tracking.timeline) {
      this.tracking.timeline = [];
    }

    this.tracking.timeline.push({
      status: 'negotiating',
      timestamp: new Date(),
      description: 'Nueva propuesta de negociación',
      performedBy: proposedBy,
      metadata: {}
    });

    return await this.save();
  } catch (error) {
    console.error('Error en addNegotiation:', error);
    throw error;
  }
};

// Static methods
QuoteSchema.statics.findByQuoteId = function(quoteId) {
  return this.findOne({ quoteId });
};

QuoteSchema.statics.findByClient = function(clientEmail) {
  return this.find({ 'client.email': clientEmail })
    .sort({ createdAt: -1 });
};

QuoteSchema.statics.findByRoute = function(origin, destination) {
  return this.find({
    'route.origin': new RegExp(origin, 'i'),
    'route.destination': new RegExp(destination, 'i')
  }).sort({ createdAt: -1 });
};

QuoteSchema.statics.getActiveQuotes = function() {
  return this.find({
    status: 'active',
    validUntil: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

QuoteSchema.statics.getQuoteStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPrice: { $avg: '$costBreakdown.total' },
        totalValue: { $sum: '$costBreakdown.total' }
      }
    }
  ]);
};

// Tracking System Static Methods
QuoteSchema.statics.findByCommercial = function(userId) {
  return this.find({ 'tracking.assignedTo': userId })
    .sort({ createdAt: -1 });
};

QuoteSchema.statics.findByClientToken = function(token) {
  return this.findOne({ 'tracking.clientAccess.token': token });
};

QuoteSchema.statics.getCommercialStatistics = function(userId) {
  return this.aggregate([
    { $match: { 'tracking.assignedTo': userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPrice: { $avg: '$costBreakdown.total' },
        totalValue: { $sum: '$costBreakdown.total' }
      }
    }
  ]);
};

QuoteSchema.statics.getActivePortalQuotes = function() {
  return this.find({
    'tracking.clientAccess.isActive': true,
    validUntil: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

const Quote = mongoose.model('Quote', QuoteSchema);

module.exports = Quote;