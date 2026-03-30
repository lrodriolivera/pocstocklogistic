const express = require('express');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const {
  authenticateToken,
  requireMinimumRole
} = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/tenants/current - Get current user's tenant
router.get('/current', async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.json({ success: true, data: null });
    }

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant no encontrado' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo tenant' });
  }
});

// PUT /api/tenants/current - Update current tenant settings (alta_gerencia only)
router.put('/current', requireMinimumRole('alta_gerencia'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant configured' });
    }

    const allowedFields = ['name', 'contactEmail', 'settings'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ success: false, error: 'Error actualizando tenant' });
  }
});

// GET /api/tenants/current/stats - Tenant usage stats
router.get('/current/stats', requireMinimumRole('supervisor'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant configured' });
    }

    const Quote = require('../models/Quote');
    const Client = require('../models/Client');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [userCount, clientCount, quotesThisMonth, tenant] = await Promise.all([
      User.countDocuments({ tenantId: req.tenantId, isActive: true }),
      Client.countDocuments({ tenantId: req.tenantId }),
      Quote.countDocuments({ tenantId: req.tenantId, createdAt: { $gte: startOfMonth } }),
      Tenant.findById(req.tenantId).lean()
    ]);

    res.json({
      success: true,
      data: {
        users: { current: userCount, max: tenant?.settings?.maxUsers || 5 },
        clients: clientCount,
        quotesThisMonth: { current: quotesThisMonth, max: tenant?.settings?.maxQuotesPerMonth || 50 },
        plan: tenant?.plan || 'free'
      }
    });
  } catch (error) {
    console.error('Error fetching tenant stats:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo estadisticas' });
  }
});

module.exports = router;
