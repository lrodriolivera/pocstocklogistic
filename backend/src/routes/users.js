/**
 * User Management Routes
 * Handles user management for supervisors and alta gerencia
 */

const express = require('express');
const {
  authenticateToken,
  requireMinimumRole,
  requireSupervisorAccess
} = require('../middleware/auth');

const router = express.Router();

// All user management routes require authentication
router.use(authenticateToken);

/**
 * Get users list (with role-based filtering)
 */
router.get('/', async (req, res) => {
  try {
    const User = require('../models/User');
    let query = { isActive: true };

    // Role-based filtering
    if (req.user.role === 'supervisor') {
      // Supervisors can see their managed agents and themselves
      const supervisor = await User.findById(req.user._id);
      const allowedUserIds = [...supervisor.managedAgents, req.user._id];
      query._id = { $in: allowedUserIds };
    }
    // Alta gerencia can see all users (no additional filter)

    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('supervisorId', 'firstName lastName email role')
      .populate('managedAgents', 'firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: {
        users,
        count: users.length,
        userRole: req.user.role
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo lista de usuarios',
      message: error.message
    });
  }
});

/**
 * Get user by ID
 */
router.get('/:userId', async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;

    // Check if user can access this resource
    if (req.user.role === 'agente_comercial' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este usuario'
      });
    }

    if (req.user.role === 'supervisor') {
      const supervisor = await User.findById(req.user._id);
      const allowedUserIds = [...supervisor.managedAgents.map(id => id.toString()), req.user._id.toString()];

      if (!allowedUserIds.includes(userId)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver este usuario'
        });
      }
    }

    const user = await User.findById(userId)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('supervisorId', 'firstName lastName email role')
      .populate('managedAgents', 'firstName lastName email role');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo usuario',
      message: error.message
    });
  }
});

/**
 * Update user (supervisors can update their managed agents)
 */
router.put('/:userId', requireSupervisorAccess, async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;
    const updates = req.body;

    // Validate allowed updates
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'department', 'isActive'];
    const updateKeys = Object.keys(updates);
    const isValidOperation = updateKeys.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        error: 'Campos de actualización no válidos'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: user
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando usuario',
      message: error.message
    });
  }
});

/**
 * Get user statistics
 */
router.get('/:userId/statistics', async (req, res) => {
  try {
    const User = require('../models/User');
    const Quote = require('../models/Quote');
    const { userId } = req.params;

    // Check access permissions
    if (req.user.role === 'agente_comercial' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver estas estadísticas'
      });
    }

    if (req.user.role === 'supervisor') {
      const supervisor = await User.findById(req.user._id);
      const allowedUserIds = [...supervisor.managedAgents.map(id => id.toString()), req.user._id.toString()];

      if (!allowedUserIds.includes(userId)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver estas estadísticas'
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Get quote statistics for this user
    const quoteStats = await Quote.getCommercialStatistics(userId);

    // Get total quotes count
    const totalQuotes = await Quote.countDocuments({ 'tracking.assignedTo': userId });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          role: user.role,
          department: user.department
        },
        statistics: {
          totalQuotes,
          quotesByStatus: quoteStats,
          metrics: user.metrics,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de usuario',
      message: error.message
    });
  }
});

/**
 * Reassign quote to different agent (supervisors only)
 */
router.post('/quotes/:quoteId/reassign', requireMinimumRole('supervisor'), async (req, res) => {
  try {
    const Quote = require('../models/Quote');
    const User = require('../models/User');
    const { quoteId } = req.params;
    const { newAgentId } = req.body;

    if (!newAgentId) {
      return res.status(400).json({
        success: false,
        error: 'ID del nuevo agente es requerido'
      });
    }

    // Verify new agent exists and can be managed by current user
    const newAgent = await User.findById(newAgentId);
    if (!newAgent || newAgent.role !== 'agente_comercial') {
      return res.status(400).json({
        success: false,
        error: 'Agente no válido'
      });
    }

    // For supervisors, check if they can manage this agent
    if (req.user.role === 'supervisor') {
      const supervisor = await User.findById(req.user._id);
      if (!supervisor.managedAgents.includes(newAgentId)) {
        return res.status(403).json({
          success: false,
          error: 'No puedes asignar cotizaciones a este agente'
        });
      }
    }

    const quote = await Quote.findOne({ quoteId });
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada'
      });
    }

    // Update quote assignment
    const oldAgentId = quote.tracking.assignedTo;
    quote.tracking.assignedTo = newAgentId;
    await quote.addTimelineEvent(
      quote.status,
      `Cotización reasignada de agente ${oldAgentId} a ${newAgentId}`,
      req.user._id.toString()
    );

    res.json({
      success: true,
      message: 'Cotización reasignada exitosamente',
      data: {
        quoteId,
        oldAgent: oldAgentId,
        newAgent: newAgentId,
        reassignedBy: req.user._id
      }
    });
  } catch (error) {
    console.error('Error reasignando cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Error reasignando cotización',
      message: error.message
    });
  }
});

/**
 * Get dashboard statistics for supervisors and alta gerencia
 */
router.get('/dashboard/statistics', requireMinimumRole('supervisor'), async (req, res) => {
  try {
    const User = require('../models/User');
    const Quote = require('../models/Quote');

    let userFilter = {};
    let quoteFilter = {};

    // Apply role-based filtering
    if (req.user.role === 'supervisor') {
      const supervisor = await User.findById(req.user._id);
      const managedUserIds = [...supervisor.managedAgents, req.user._id];
      userFilter._id = { $in: managedUserIds };
      quoteFilter['tracking.assignedTo'] = { $in: managedUserIds.map(id => id.toString()) };
    }
    // Alta gerencia sees all data

    const [
      totalUsers,
      usersByRole,
      totalQuotes,
      quotesByStatus,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ ...userFilter, isActive: true }),
      User.aggregate([
        { $match: { ...userFilter, isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Quote.countDocuments(quoteFilter),
      Quote.aggregate([
        { $match: quoteFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$costBreakdown.total' } } }
      ]),
      Quote.find(quoteFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('quoteId status costBreakdown.total route client tracking.assignedTo createdAt')
        .populate('tracking.assignedTo', 'firstName lastName')
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalQuotes,
          userRole: req.user.role
        },
        users: {
          byRole: usersByRole
        },
        quotes: {
          byStatus: quotesByStatus
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas del dashboard',
      message: error.message
    });
  }
});

module.exports = router;