const express = require('express');
const rateLimit = require('express-rate-limit');
const QuoteController = require('../controllers/quoteController');
const {
  authenticateToken,
  requireMinimumRole,
  optionalAuth
} = require('../middleware/auth');
const {
  validateQuoteGeneration,
  validateRouteQuery,
  validateQuoteId,
  rateLimitConfig
} = require('../middleware/validation');

const router = express.Router();
const quoteController = new QuoteController();

const quotesRateLimit = rateLimit(rateLimitConfig);

router.use(quotesRateLimit);

// Protected routes (require authentication)
router.post('/generate',
  authenticateToken,
  validateQuoteGeneration,
  (req, res) => quoteController.generateQuote(req, res)
);

// AI Agent route (no authentication required for internal service)
router.post('/ai-generate',
  (req, res) => quoteController.generateQuoteFromAI(req, res)
);

router.get('/validate-route',
  authenticateToken,
  validateRouteQuery,
  (req, res) => quoteController.validateRoute(req, res)
);

router.get('/status',
  (req, res) => quoteController.getStatus(req, res)
);

router.get('/openroute-health',
  (req, res) => quoteController.getOpenRouteHealth(req, res)
);

// Negotiation Management Routes (Commercial) - MUST be before /:id routes
router.get('/negotiations/pending',
  authenticateToken,
  (req, res) => quoteController.getPendingNegotiations(req, res)
);

router.get('/:id',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.getQuote(req, res)
);

router.post('/:id/accept',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.acceptQuote(req, res)
);

// Quote history and management routes
router.get('/history/all',
  authenticateToken,
  (req, res) => quoteController.getQuoteHistory(req, res)
);

router.get('/statistics/overview',
  authenticateToken,
  requireMinimumRole('supervisor'),
  (req, res) => quoteController.getQuoteStatistics(req, res)
);

// Tracking System Routes
router.post('/:id/status',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.updateQuoteStatus(req, res)
);

router.get('/:id/timeline',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.getQuoteTimeline(req, res)
);

router.post('/:id/generate-portal-access',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.generatePortalAccess(req, res)
);

router.post('/:id/email-template',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.generateEmailTemplate(req, res)
);

router.post('/:id/negotiations',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.addNegotiation(req, res)
);

router.post('/:id/counter-offer',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.sendCounterOffer(req, res)
);

router.post('/:id/accept-proposal',
  authenticateToken,
  validateQuoteId,
  (req, res) => quoteController.acceptClientProposal(req, res)
);

// Client Portal Routes
router.get('/portal/:token',
  (req, res) => quoteController.getQuoteByToken(req, res)
);

router.post('/portal/:token/view',
  (req, res) => quoteController.recordClientView(req, res)
);

// Client Portal Actions
router.post('/portal/:token/accept',
  (req, res) => quoteController.acceptQuoteByToken(req, res)
);

router.post('/portal/:token/reject',
  (req, res) => quoteController.rejectQuoteByToken(req, res)
);

router.post('/portal/:token/negotiate',
  (req, res) => quoteController.negotiateQuoteByToken(req, res)
);

router.post('/portal/:token/respond-counter-offer',
  (req, res) => quoteController.respondToCounterOfferByToken(req, res)
);

module.exports = router;