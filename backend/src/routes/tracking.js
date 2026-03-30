const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTrackingService } = require('../services/trackingService');

const router = express.Router();

router.use(authenticateToken);

// GET /api/tracking/status - Provider configuration status
router.get('/status', (req, res) => {
  const tracking = getTrackingService();
  res.json({ success: true, data: tracking.getProviderStatus() });
});

// POST /api/tracking/create - Create tracking for a shipment
router.post('/create', async (req, res) => {
  try {
    const tracking = getTrackingService();
    const result = await tracking.createTracking(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Tracking create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tracking/:trackingId - Get current status
router.get('/:trackingId', async (req, res) => {
  try {
    const tracking = getTrackingService();
    const result = await tracking.getTrackingStatus(req.params.trackingId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Tracking status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tracking/:trackingId/eta - Get ETA
router.get('/:trackingId/eta', async (req, res) => {
  try {
    const tracking = getTrackingService();
    const result = await tracking.getETA(req.params.trackingId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Tracking ETA error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tracking/:trackingId/history - Get position history
router.get('/:trackingId/history', async (req, res) => {
  try {
    const tracking = getTrackingService();
    const result = await tracking.getTrackingHistory(req.params.trackingId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Tracking history error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
