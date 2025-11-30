/**
 * User Model for Authentication & Authorization
 * Supports role-based access control with hierarchical permissions
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ['agente_comercial', 'supervisor', 'alta_gerencia'],
    required: true,
    default: 'agente_comercial'
  },

  // Organizational Information
  department: {
    type: String,
    default: 'Comercial'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },

  // Status & Activity
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },

  // Supervisor Assignment (for agents)
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },

  // Agent Management (for supervisors)
  managedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Performance Metrics
  metrics: {
    totalQuotes: {
      type: Number,
      default: 0
    },
    acceptedQuotes: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageQuoteValue: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },

  // Settings & Preferences
  preferences: {
    language: {
      type: String,
      default: 'es',
      enum: ['es', 'en', 'fr']
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    dashboardLayout: {
      type: String,
      default: 'standard'
    }
  },

  // Security
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    }
  }
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ supervisorId: 1 });
UserSchema.index({ employeeId: 1 });
UserSchema.index({ 'metrics.totalRevenue': -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for employee ID generation
UserSchema.pre('save', async function(next) {
  if (!this.employeeId && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Instance Methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.updateLoginInfo = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

UserSchema.methods.hasPermission = function(requiredRole) {
  const roleHierarchy = {
    'agente_comercial': 1,
    'supervisor': 2,
    'alta_gerencia': 3
  };

  return roleHierarchy[this.role] >= roleHierarchy[requiredRole];
};

UserSchema.methods.canAccessUser = function(targetUserId) {
  // Alta gerencia can access all users
  if (this.role === 'alta_gerencia') return true;

  // Supervisors can access their managed agents
  if (this.role === 'supervisor') {
    return this.managedAgents.includes(targetUserId) || this._id.equals(targetUserId);
  }

  // Agents can only access themselves
  return this._id.equals(targetUserId);
};

UserSchema.methods.canAccessQuote = function(quoteOwnerId) {
  // Alta gerencia can access all quotes
  if (this.role === 'alta_gerencia') return true;

  // Supervisors can access quotes from their managed agents
  if (this.role === 'supervisor') {
    return this.managedAgents.includes(quoteOwnerId) || this._id.equals(quoteOwnerId);
  }

  // Agents can only access their own quotes
  return this._id.equals(quoteOwnerId);
};

UserSchema.methods.updateMetrics = async function() {
  const Quote = require('./Quote');

  const quotes = await Quote.find({ 'tracking.assignedTo': this._id });
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');

  const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.costBreakdown?.total || 0), 0);
  const conversionRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;
  const averageQuoteValue = acceptedQuotes.length > 0 ? totalRevenue / acceptedQuotes.length : 0;

  this.metrics = {
    totalQuotes: quotes.length,
    acceptedQuotes: acceptedQuotes.length,
    totalRevenue,
    averageQuoteValue,
    conversionRate,
    lastCalculated: new Date()
  };

  return this.save();
};

// Static Methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true }).sort({ firstName: 1, lastName: 1 });
};

UserSchema.statics.getAgentsBySupervisor = function(supervisorId) {
  return this.find({
    supervisorId,
    isActive: true,
    role: 'agente_comercial'
  }).sort({ firstName: 1, lastName: 1 });
};

UserSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({
    role: 'agente_comercial',
    isActive: true
  })
  .sort({ 'metrics.totalRevenue': -1 })
  .limit(limit);
};

UserSchema.statics.getDashboardStats = async function() {
  const totalUsers = await this.countDocuments({ isActive: true });
  const activeAgents = await this.countDocuments({
    role: 'agente_comercial',
    isActive: true
  });
  const supervisors = await this.countDocuments({
    role: 'supervisor',
    isActive: true
  });

  const totalRevenue = await this.aggregate([
    { $match: { isActive: true, role: 'agente_comercial' } },
    { $group: { _id: null, total: { $sum: '$metrics.totalRevenue' } } }
  ]);

  return {
    totalUsers,
    activeAgents,
    supervisors,
    totalRevenue: totalRevenue[0]?.total || 0
  };
};

const User = mongoose.model('User', UserSchema);

module.exports = User;