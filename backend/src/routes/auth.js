/**
 * Authentication Routes
 * Handles login, registration, and user management endpoints
 */

const express = require('express');
const crypto = require('crypto');
const AuthController = require('../controllers/authController');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { getEmailService } = require('../services/emailService');
const {
  authenticateToken,
  requireRole,
  requireMinimumRole
} = require('../middleware/auth');

const router = express.Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/login', (req, res) => authController.login(req, res));

// Public registration (self-signup)
router.post('/register-public', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: email, password, firstName, lastName'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email invalido'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La contrasena debe tener al menos 8 caracteres'
      });
    }

    // Check duplicate email
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con este email'
      });
    }

    // Create user with default role
    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      phone: phone || undefined,
      role: 'agente_comercial',
      department: 'Comercial',
      emailVerified: true
    });

    await newUser.save();

    // Send welcome email (non-blocking)
    try {
      const emailService = getEmailService();
      await emailService.sendWelcomeEmail(newUser.email, newUser.fullName);
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr.message);
    }

    // Generate token for auto-login
    const token = generateToken(newUser._id);

    const userData = {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: newUser.fullName,
      role: newUser.role,
      department: newUser.department,
      employeeId: newUser.employeeId,
      preferences: newUser.preferences,
      metrics: newUser.metrics,
      lastLogin: newUser.lastLogin
    };

    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      data: {
        user: userData,
        token,
        expiresIn: '7d'
      }
    });
  } catch (error) {
    console.error('Public registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con este email'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error creando cuenta'
    });
  }
});

// Forgot password (public)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }

    // Always return success to avoid email enumeration
    const user = await User.findByEmail(email);

    if (user && user.isActive) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save({ validateBeforeSave: false });

      // Send reset email (non-blocking)
      try {
        const emailService = getEmailService();
        await emailService.sendPasswordReset(user.email, resetToken);
      } catch (emailErr) {
        console.error('Error sending reset email:', emailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Si el email existe, recibiras instrucciones para restablecer tu contrasena'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando solicitud'
    });
  }
});

// Reset password (public)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token y nueva contrasena son requeridos'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La contrasena debe tener al menos 8 caracteres'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token invalido o expirado'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Contrasena actualizada exitosamente'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Error restableciendo contrasena'
    });
  }
});

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