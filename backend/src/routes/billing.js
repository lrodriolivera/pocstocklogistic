const express = require('express');
const { authenticateToken, requireMinimumRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { getStripeService, PLANS } = require('../services/stripeService');

const router = express.Router();

// GET /api/billing/plans - Public plans info
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: Object.entries(PLANS).map(([id, plan]) => ({
      id,
      ...plan,
      priceMonthly: plan.priceMonthly ? `${plan.priceMonthly} EUR` : 'Contactar'
    }))
  });
});

// All other billing routes require auth + tenant
router.use(authenticateToken);
router.use(requireTenant);

// GET /api/billing/status - Current subscription status
router.get('/status', async (req, res) => {
  try {
    const stripe = getStripeService();
    const status = await stripe.getSubscriptionStatus(req.tenantId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/billing/checkout - Create checkout session (alta_gerencia only)
router.post('/checkout', requireMinimumRole('alta_gerencia'), async (req, res) => {
  try {
    const stripe = getStripeService();
    if (!stripe.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Billing not configured. Set STRIPE_SECRET_KEY.' });
    }

    const { planId } = req.body;
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ success: false, error: 'Plan invalido' });
    }

    const session = await stripe.createCheckoutSession(req.tenantId, planId, req.user.email);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/billing/portal - Customer portal session (alta_gerencia only)
router.post('/portal', requireMinimumRole('alta_gerencia'), async (req, res) => {
  try {
    const stripe = getStripeService();
    if (!stripe.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Billing not configured' });
    }

    const session = await stripe.createPortalSession(req.tenantId);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
