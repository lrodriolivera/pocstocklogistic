const express = require('express');
const rateLimit = require('express-rate-limit');
const AIController = require('../controllers/aiController');
const {
  validateQuickAdvice,
  validateRestrictionAnalysis,
  aiRateLimitConfig
} = require('../middleware/validation');

const router = express.Router();
const aiController = new AIController();

const aiRateLimit = rateLimit(aiRateLimitConfig);

router.use(aiRateLimit);

router.post('/quick-advice',
  validateQuickAdvice,
  (req, res) => aiController.getQuickAdvice(req, res)
);

router.post('/analyze-restrictions',
  validateRestrictionAnalysis,
  (req, res) => aiController.analyzeRestrictions(req, res)
);

router.get('/health',
  (req, res) => aiController.checkHealth(req, res)
);

router.get('/capabilities',
  (req, res) => aiController.getCapabilities(req, res)
);

module.exports = router;