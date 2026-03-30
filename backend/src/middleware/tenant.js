// Middleware that injects tenantId from the authenticated user into requests
const injectTenantId = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
};

// Middleware that requires tenantId to be present
const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({ success: false, error: 'Tenant not configured' });
  }
  next();
};

/**
 * Build a tenant-scoped filter for MongoDB queries.
 * If the user has a tenantId, all queries are scoped to that tenant.
 * @param {Object} req - Express request with tenantId injected
 * @param {Object} [baseFilter={}] - Additional filter to merge
 * @returns {Object} MongoDB query filter including tenantId scope
 */
const buildTenantFilter = (req, baseFilter = {}) => {
  if (req.tenantId) {
    return { ...baseFilter, tenantId: req.tenantId };
  }
  return baseFilter;
};

/**
 * Inject tenantId into a document before saving.
 * Call this when creating new resources (Clients, Quotes, etc.)
 * @param {Object} req - Express request with tenantId injected
 * @param {Object} doc - Mongoose document or plain object
 */
const stampTenant = (req, doc) => {
  if (req.tenantId && doc) {
    doc.tenantId = req.tenantId;
  }
};

module.exports = { injectTenantId, requireTenant, buildTenantFilter, stampTenant };
