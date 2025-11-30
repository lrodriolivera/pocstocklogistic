/**
 * Authentication & Authorization Middleware
 * Handles JWT token validation and role-based access control
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

/**
 * Authentication middleware - verifies JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Cuenta desactivada'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
};

/**
 * Authorization middleware - checks user roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Convert single role to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user has minimum role level
 */
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!req.user.hasPermission(minimumRole)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes',
        required: minimumRole,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user can access specific resource
 */
const requireResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    try {
      let hasAccess = false;
      const resourceId = req.params.id || req.params.userId || req.params.quoteId;

      switch (resourceType) {
        case 'user':
          hasAccess = req.user.canAccessUser(resourceId);
          break;

        case 'quote':
          // For quotes, we need to check the quote's assignedTo field
          const Quote = require('../models/Quote');
          const quote = await Quote.findOne({ quoteId: req.params.id });
          if (quote) {
            hasAccess = req.user.canAccessQuote(quote.tracking?.assignedTo);
          }
          break;

        case 'own-resource':
          // User can only access their own resource
          hasAccess = req.user._id.toString() === resourceId;
          break;

        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Acceso no autorizado a este recurso'
        });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error verificando permisos'
      });
    }
  };
};

/**
 * Supervisor-specific middleware - checks if user can manage target user
 */
const requireSupervisorAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado'
    });
  }

  try {
    const targetUserId = req.params.userId || req.params.agentId;

    // Alta gerencia can access all
    if (req.user.role === 'alta_gerencia') {
      return next();
    }

    // Supervisors can only access their managed agents
    if (req.user.role === 'supervisor') {
      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      if (req.user.managedAgents.includes(targetUserId) || req.user._id.equals(targetUserId)) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'No tiene permisos para gestionar este usuario'
    });
  } catch (error) {
    console.error('Supervisor access check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verificando permisos de supervisor'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

/**
 * Rate limiting by user role
 */
const rateLimitByRole = () => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.user ? `${req.user._id}:${req.user.role}` : req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // Different limits by role
    const limits = {
      'agente_comercial': 100,
      'supervisor': 200,
      'alta_gerencia': 500,
      'anonymous': 20
    };

    const userRole = req.user ? req.user.role : 'anonymous';
    const limit = limits[userRole] || limits.anonymous;

    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userAttempts = attempts.get(key);

    if (now > userAttempts.resetTime) {
      userAttempts.count = 1;
      userAttempts.resetTime = now + windowMs;
      return next();
    }

    if (userAttempts.count >= limit) {
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes, intente más tarde'
      });
    }

    userAttempts.count++;
    next();
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireMinimumRole,
  requireResourceAccess,
  requireSupervisorAccess,
  optionalAuth,
  rateLimitByRole
};