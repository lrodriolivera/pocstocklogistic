// Middleware that injects tenantId from the authenticated user into requests
const injectTenantId = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
};

// Middleware that filters queries by tenantId
const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({ success: false, error: 'Tenant not configured' });
  }
  next();
};

module.exports = { injectTenantId, requireTenant };
