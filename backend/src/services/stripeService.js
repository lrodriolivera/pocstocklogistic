/**
 * Stripe Billing Service
 *
 * Manages subscriptions, checkout sessions, and webhooks for AXEL.
 * Plans are linked to Tenant model.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY - Stripe secret key (sk_test_... or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET - Webhook signing secret (whsec_...)
 *   FRONTEND_URL - For checkout success/cancel redirects
 */

const Tenant = require('../models/Tenant');

// Plans configuration
const PLANS = {
  professional: {
    name: 'Professional',
    priceMonthly: 149, // EUR
    maxUsers: 5,
    maxQuotesPerMonth: 50,
    features: { chat: true, freightExchange: false, clientPortal: true, emailNotifications: true }
  },
  business: {
    name: 'Business',
    priceMonthly: 749,
    maxUsers: 20,
    maxQuotesPerMonth: 200,
    features: { chat: true, freightExchange: true, clientPortal: true, emailNotifications: true }
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: null, // Custom pricing
    maxUsers: -1, // Unlimited
    maxQuotesPerMonth: -1,
    features: { chat: true, freightExchange: true, clientPortal: true, emailNotifications: true }
  }
};

class StripeService {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.stripe = null;

    if (this.secretKey) {
      this.stripe = require('stripe')(this.secretKey);
      console.log('💳 StripeService initialized (live)');
    } else {
      console.log('💳 StripeService initialized (no key - billing disabled)');
    }
  }

  isConfigured() {
    return !!this.stripe;
  }

  /**
   * Create a Stripe Checkout Session for a plan upgrade
   */
  async createCheckoutSession(tenantId, planId, userEmail) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const plan = PLANS[planId];
    if (!plan || !plan.priceMonthly) {
      throw new Error(`Invalid plan: ${planId}. Contact sales for Enterprise.`);
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    // Create or retrieve Stripe customer
    let customerId = tenant.billing?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: { tenantId: tenantId.toString(), tenantName: tenant.name }
      });
      customerId = customer.id;
      tenant.billing = tenant.billing || {};
      tenant.billing.stripeCustomerId = customerId;
      await tenant.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://axel.strixai.es';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `AXEL ${plan.name}`,
            description: `${plan.maxQuotesPerMonth} cotizaciones/mes, ${plan.maxUsers} usuarios`
          },
          unit_amount: plan.priceMonthly * 100, // Stripe uses cents
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      metadata: { tenantId: tenantId.toString(), planId },
      success_url: `${frontendUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing?canceled=true`
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody, signature) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { tenantId, planId } = session.metadata;
        if (tenantId && planId) {
          await this._activateSubscription(tenantId, planId, session.subscription);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        if (subscription.status === 'active') {
          // Subscription renewed or updated
          console.log(`Subscription ${subscription.id} updated: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this._deactivateSubscription(subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.error(`Payment failed for invoice ${invoice.id}, customer ${invoice.customer}`);
        break;
      }
    }

    return { received: true, type: event.type };
  }

  /**
   * Get billing portal URL for customer self-service
   */
  async createPortalSession(tenantId) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const tenant = await Tenant.findById(tenantId);
    if (!tenant?.billing?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this tenant');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://axel.strixai.es';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.billing.stripeCustomerId,
      return_url: `${frontendUrl}/billing`
    });

    return { url: session.url };
  }

  /**
   * Get current subscription status for a tenant
   */
  async getSubscriptionStatus(tenantId) {
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) throw new Error('Tenant not found');

    const result = {
      plan: tenant.plan || 'free',
      planDetails: PLANS[tenant.plan] || PLANS.professional,
      stripeConfigured: this.isConfigured(),
      hasSubscription: !!tenant.billing?.stripeSubscriptionId
    };

    if (this.stripe && tenant.billing?.stripeSubscriptionId) {
      try {
        const sub = await this.stripe.subscriptions.retrieve(tenant.billing.stripeSubscriptionId);
        result.subscription = {
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end
        };
      } catch (err) {
        result.subscription = { status: 'error', error: err.message };
      }
    }

    return result;
  }

  // ─── Internal helpers ──────────────────────────────────────────────

  async _activateSubscription(tenantId, planId, subscriptionId) {
    const plan = PLANS[planId];
    if (!plan) return;

    await Tenant.findByIdAndUpdate(tenantId, {
      plan: planId,
      'billing.stripeSubscriptionId': subscriptionId,
      'settings.maxUsers': plan.maxUsers,
      'settings.maxQuotesPerMonth': plan.maxQuotesPerMonth,
      'settings.features': plan.features
    });

    console.log(`✅ Tenant ${tenantId} upgraded to ${planId}`);
  }

  async _deactivateSubscription(subscriptionId) {
    const tenant = await Tenant.findOne({ 'billing.stripeSubscriptionId': subscriptionId });
    if (!tenant) return;

    tenant.plan = 'free';
    tenant.billing.stripeSubscriptionId = null;
    tenant.settings.maxUsers = 5;
    tenant.settings.maxQuotesPerMonth = 50;
    tenant.settings.features = PLANS.professional.features; // Keep basic features
    await tenant.save();

    console.log(`⚠️ Tenant ${tenant._id} downgraded to free (subscription canceled)`);
  }
}

// Singleton
let instance = null;
const getStripeService = () => {
  if (!instance) instance = new StripeService();
  return instance;
};

module.exports = { StripeService, getStripeService, PLANS };
