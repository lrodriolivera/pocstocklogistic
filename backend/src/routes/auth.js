/**
 * Authentication Routes
 * Handles login, registration, and user management endpoints
 */

const express = require('express');
const AuthController = require('../controllers/authController');
const {
  authenticateToken,
  requireRole,
  requireMinimumRole
} = require('../middleware/auth');

const router = express.Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes (authentication required)
router.use(authenticateToken);

// User profile routes
router.get('/profile', (req, res) => authController.getProfile(req, res));
router.put('/profile', (req, res) => authController.updateProfile(req, res));
router.post('/change-password', (req, res) => authController.changePassword(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

// Registration route (only for supervisors and alta_gerencia)
router.post('/register',
  requireMinimumRole('supervisor'),
  (req, res) => authController.register(req, res)
);

module.exports = router;