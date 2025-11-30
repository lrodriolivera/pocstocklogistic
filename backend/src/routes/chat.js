/**
 * Chat Routes - API endpoints para LUCI
 */

const express = require('express');
const ChatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const chatController = new ChatController();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Chat endpoints
router.post('/message', (req, res) => chatController.sendMessage(req, res));

router.get('/greeting', (req, res) => chatController.getGreeting(req, res));

router.post('/assist/quote', (req, res) => chatController.getQuoteAssistance(req, res));

router.post('/assist/form', (req, res) => chatController.smartFormAssist(req, res));

router.post('/validate', (req, res) => chatController.validateData(req, res));

router.delete('/session/:sessionId', (req, res) => chatController.clearSession(req, res));

router.get('/status', (req, res) => chatController.getStatus(req, res));

module.exports = router;